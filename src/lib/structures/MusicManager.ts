import { Shoukaku, Connectors } from 'shoukaku';
import { container } from '@sapphire/framework';
import type { CaramelClient } from '../../structures/CaramelClient';
import { MusicPlayer } from './MusicPlayer';


// Music manager ──────────────────

export class MusicManager extends Shoukaku {
    public queues: Map<string, MusicPlayer> = new Map();
    private readonly discordClient: CaramelClient;
    private readonly forceReconnectInFlight = new Set<string>();
    private readonly reconnectWatchdogTimers = new Map<string, NodeJS.Timeout>();
    private readonly reconnectHeartbeat = new Map<string, { reconnectsLeft: number; interval: number }>();
    private readonly reconnectMetrics = new Map<string, {
        forcedAttempts: number;
        forcedSuccess: number;
        forcedFailure: number;
        lastReason: string | null;
        lastAt: number | null;
    }>();
    private readonly nodeConfigs: Array<{ name: string; url: string; auth: string; secure?: boolean; group?: string }>;
    private readonly nodePoolGuard: NodeJS.Timeout;

    private startNodePoolGuard() {
        return setInterval(() => {
            for (const config of this.nodeConfigs) {
                if (this.nodes.has(config.name)) continue;

                container.logger.warn(`⚠️ [LAVALINK] Node "${config.name}" missing from pool; re-adding node.`);
                this.addNode(config);
            }
        }, 6000);
    }

    private getNodeByName(name: string) {
        return this.nodes.get(name)
            ?? Array.from(this.nodes.values()).find(node => node.name === name)
            ?? null;
    }

    private getReconnectMetrics(name: string) {
        const existing = this.reconnectMetrics.get(name);
        if (existing) return existing;

        const initial = {
            forcedAttempts: 0,
            forcedSuccess: 0,
            forcedFailure: 0,
            lastReason: null,
            lastAt: null
        };

        this.reconnectMetrics.set(name, initial);
        return initial;
    }

    private async forceNodeReconnect(name: string, reason: string, forceReset: boolean = false) {
        if (this.forceReconnectInFlight.has(name)) return;

        this.forceReconnectInFlight.add(name);
        const metrics = this.getReconnectMetrics(name);
        metrics.forcedAttempts += 1;
        metrics.lastReason = reason;
        metrics.lastAt = Date.now();

        try {
            const node = this.getNodeByName(name);
            if (!node) return;

            // If already connected, nothing to do.
            if (node.state === 1) return;

            // If still in normal connecting flow and no hard reset requested, let Shoukaku continue.
            if (node.state === 0 && !forceReset) return;

            container.logger.warn(`⚠️ [LAVALINK] Forcing clean reconnect for node "${name}" (${reason}).`);

            node.sessionId = null;

            if (forceReset) {
                try {
                    node.disconnect(1000, 'watchdog-reset');
                } catch (disconnectError) {
                    // During reconnect races the node may already be closing/disconnected; ignore these soft failures.
                    container.logger.debug(`[LAVALINK] Node "${name}" disconnect during force reset was already in-flight: ${(disconnectError as Error).message}`);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            await node.connect();
            metrics.forcedSuccess += 1;
            container.logger.info(`🎵 [LAVALINK] Forced reconnect success for "${name}". attempts=${metrics.forcedAttempts}, success=${metrics.forcedSuccess}, failure=${metrics.forcedFailure}`);
        } catch (error) {
            metrics.forcedFailure += 1;
            container.logger.error(`[LAVALINK] Forced reconnect failed for node "${name}":`, error);
        } finally {
            // Debounce repeated forced reconnects.
            setTimeout(() => {
                this.forceReconnectInFlight.delete(name);
            }, 3000);
        }
    }

    private scheduleReconnectWatchdog(name: string, reason: string, delayMs: number = 8000) {
        const existing = this.reconnectWatchdogTimers.get(name);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            this.reconnectWatchdogTimers.delete(name);

            const node = this.getNodeByName(name);
            if (!node) return;

            // If it already recovered, skip forced reconnect.
            if (node.state === 1) return;

            this.forceNodeReconnect(name, `${reason}-watchdog`).catch(() => null);
        }, delayMs);

        this.reconnectWatchdogTimers.set(name, timer);
    }

    private async recoverActiveQueuesAfterReady(nodeName: string) {
        // Give Shoukaku a brief window to perform its own resume flow first.
        await new Promise(resolve => setTimeout(resolve, 1500));

        const activeNode = this.getNodeByName(nodeName);
        if (!activeNode?.sessionId) {
            container.logger.warn(`⚠️ [LAVALINK] Ready received for "${nodeName}" without sessionId; skipping queue recovery this cycle.`);
            return;
        }

        for (const [guildId, activeQueue] of this.queues) {
            try {
                const guild = this.discordClient.guilds.cache.get(guildId) ?? await this.discordClient.guilds.fetch(guildId).catch(() => null);
                if (!guild) continue;

                const voiceChannelId = guild.members.me?.voice.channelId;
                if (!voiceChannelId) continue;

                let player = this.players.get(guildId);

                // If player is bound to a stale node/session, recreate it on the active node.
                const stalePlayer = Boolean(player && (!player.node?.sessionId || player.node.state !== 1 || player.node.name !== activeNode.name));
                if (player && stalePlayer) {
                    await player.destroy().catch(() => null);
                    await this.leaveVoiceChannel(guildId).catch(() => null);
                    player = null as any;
                }

                if (!player) {
                    player = await this.joinVoiceChannel({
                        guildId,
                        channelId: voiceChannelId,
                        shardId: guild.shardId,
                        deaf: true
                    }).catch(() => null) as any;
                }

                if (!player) continue;

                // If a different player instance is active now, rebuild the queue wrapper over it.
                let queueRef = activeQueue;
                if (activeQueue.player !== player) {
                    const rebuilt = new MusicPlayer(guildId, player, {
                        queue: [...activeQueue.queue],
                        current: activeQueue.current ? { ...(activeQueue.current as any) } : null,
                        loop: activeQueue.loop,
                        autoplay: activeQueue.autoplay,
                        textChannelId: activeQueue.textChannelId,
                        isPaused: activeQueue.player.paused,
                        activeFilter: activeQueue.activeFilter
                    });

                    activeQueue.dispose();
                    this.queues.set(guildId, rebuilt);
                    queueRef = rebuilt;
                }

                // Fallback only when nothing is actively playing after reconnect.
                if (!player.track && queueRef.current) {
                    await player.playTrack({ track: { encoded: (queueRef.current as any).encoded } }).catch(() => null);
                    container.logger.warn(`⚠️ [LAVALINK] Fallback resume applied for guild ${guildId} on node ${nodeName}.`);
                }
            } catch (error) {
                container.logger.error(`[LAVALINK] Failed queue fallback recovery for guild ${guildId}:`, error);
            }
        }
    }

    public constructor(client: CaramelClient) {
        const discordClient = client;
        
        // Lavalink nodes configuration ──────────

        const nodes = [
            {
                name: 'LocalNode-01',
                url: 'localhost:2333',
                auth: 'youshallnotpass',
                secure: false
            }
        ];

        super(new Connectors.DiscordJS(discordClient), nodes, {
            moveOnDisconnect: true,
            resume: true,
            resumeTimeout: 60,
            resumeByLibrary: true,
            reconnectTries: 30,
            reconnectInterval: 2,
            restTimeout: 10000
        });

        this.discordClient = discordClient;
        this.nodeConfigs = nodes;
        this.nodePoolGuard = this.startNodePoolGuard();

        this.on('ready', (name, lavalinkResume, libraryResume) => {
            this.reconnectHeartbeat.delete(name);

            const watchdog = this.reconnectWatchdogTimers.get(name);
            if (watchdog) {
                clearTimeout(watchdog);
                this.reconnectWatchdogTimers.delete(name);
            }

            container.logger.info(`🎵 [LAVALINK] Node "${name}" connected and ready. (lavalinkResume=${lavalinkResume}, libraryResume=${libraryResume})`);
            // Trigger restoration immediately on first node ready
            import('../utils/MusicRestorer').then(({ MusicRestorer }) => {
                MusicRestorer.restore().catch(err => container.logger.error('[MUSIC_RESTORE] Failed:', err));
            });

            // Runtime fallback: recover active in-memory queues if native resume does not fully recover.
            this.recoverActiveQueuesAfterReady(name).catch(err => {
                container.logger.error('[MUSIC_RECOVERY] Failed:', err);
            });
        });

        this.on('reconnecting', (name, reconnectsLeft, reconnectInterval) => {
            this.reconnectHeartbeat.set(name, { reconnectsLeft, interval: reconnectInterval });
            // Heartbeat watchdog: if reconnecting events stop unexpectedly, recover quickly.
            this.scheduleReconnectWatchdog(name, 'reconnect-heartbeat-missed', Math.max(8000, reconnectInterval * 4000));
            container.logger.warn(`⚠️ [LAVALINK] Node "${name}" reconnecting in ${reconnectInterval}s. (${reconnectsLeft} tries left)`);
        });

        this.on('error', (name, error) => {
            container.logger.error(`🔴 [LAVALINK] Node "${name}" encountered an error:`, error);

            const message = error?.message ?? '';
            if (message.includes('Websocket closed before a connection was established')) {
                const node = this.getNodeByName(name);
                const heartbeat = this.reconnectHeartbeat.get(name);
                const interval = heartbeat?.interval ?? this.options.reconnectInterval;

                // If reconnect events stop here, watchdog will recover quickly; otherwise it keeps getting refreshed.
                this.scheduleReconnectWatchdog(name, 'ws-handshake-stalled', Math.max(8000, interval * 4000));
                container.logger.warn(`⚠️ [LAVALINK] Node "${name}" stalled during handshake (state=${node?.state ?? 'n/a'}, reconnects=${node?.reconnects ?? 'n/a'}). Waiting for reconnect heartbeat before forcing recovery.`);
            }
        });

        this.on('disconnect', (name, count) => {
            container.logger.warn(`⚠️ [LAVALINK] Node "${name}" disconnected. (Count: ${count})`);
            this.reconnectHeartbeat.delete(name);
            // Disconnect means retries are over; recover quickly.
            this.scheduleReconnectWatchdog(name, 'node-disconnected-post-cycle', 3000);
        });

        this.on('close', (name, code, reason) => {
            // On abrupt server restarts the previous session id can become invalid and block reconnect.
            const node = this.getNodeByName(name);
            if (node) node.sessionId = null;
            container.logger.warn(`🛑 [LAVALINK] Node "${name}" closed connection. (Code: ${code}, Reason: ${reason})`);
        });
    }
}
