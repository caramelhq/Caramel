import { container } from '@sapphire/framework';
import { DiscordAPIError, RESTJSONErrorCodes, type Client, type Guild } from 'discord.js';
import { prisma } from '../database/db';
import { CacheManager } from '../database/CacheManager';
import { getCounterLayout } from '../lib/layouts/counterLayouts';
import {
    collectStats,
    isCounterChannel,
    statsEqual,
    type CounterChannel,
    type CounterStats
} from '../lib/utils/counterStats';


// Counter service ──────────────────
//
// One timer drives every guild rather than one timer each: the work per tick is
// small and a single loop keeps the scheduling in one place.
//
// Ticking is cheap only because of the comparison below — a guild whose numbers
// did not move costs one guild fetch and no edit. Editing unconditionally on a
// short interval would run straight into the per-channel rate limit.

const DEFAULT_INTERVAL_MS = 15_000;

/** How often the active set is re-read from the database, in ticks. */
const RESCAN_EVERY_TICKS = 20;

interface GuildCounter {
    channel: CounterChannel;
    messageId: string | null;
    lastStats: CounterStats | null;
    /** In-flight edit. While set, ticks for this guild are dropped. */
    inFlight: Promise<void> | null;
}

/** A concurrent setChannel while another is half-done. */
export class CounterBusyError extends Error {
    public constructor() {
        super('A counter channel change is already in progress.');
        this.name = 'CounterBusyError';
    }
}

export class CounterService {
    private readonly client: Client;
    private readonly intervalMs: number;
    private readonly counters = new Map<string, GuildCounter>();
    private readonly switching = new Set<string>();

    private timer: NodeJS.Timeout | null = null;
    private stopped = false;
    private ticksSinceRescan = 0;

    public constructor(client: Client) {
        this.client = client;
        const configured = Number(process.env.COUNTER_INTERVAL_MS);
        this.intervalMs = Number.isFinite(configured) && configured >= 5000 ? configured : DEFAULT_INTERVAL_MS;
    }

    /** Channel the counter is published in for a guild, or null. */
    public channelIdFor(guildId: string): string | null {
        return this.counters.get(guildId)?.channel.id ?? null;
    }


    // Lifecycle ──────────

    /** Restores every configured counter, then starts the loop. */
    public async start(): Promise<void> {
        await this.rescan();
        this.schedule();
        container.logger.info(
            `[COUNTER] Tracking ${this.counters.size} guild(s), refreshing every ${this.intervalMs}ms.`
        );
    }

    public async stop(): Promise<void> {
        this.stopped = true;
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        await Promise.all(
            [...this.counters.values()].map((counter) => counter.inFlight?.catch(() => undefined))
        );
    }

    private schedule(): void {
        if (this.stopped || this.timer !== null) return;
        this.timer = setInterval(() => void this.tickAll(), this.intervalMs);
    }


    // Channel management ──────────

    /**
     * Publishes the counter in a channel and starts tracking it there. Deletes
     * the previous message first when moving. The caller is expected to have
     * already rejected the "same channel" case.
     */
    public async setChannel(guild: Guild, channel: CounterChannel): Promise<void> {
        if (this.switching.has(guild.id)) throw new CounterBusyError();
        this.switching.add(guild.id);

        try {
            const existing = this.counters.get(guild.id);
            if (existing) {
                await existing.inFlight?.catch(() => undefined);
                await this.deleteMessage(existing.channel, existing.messageId);
                this.counters.delete(guild.id);
            }

            const stats = await collectStats(guild);
            const message = await channel.send(getCounterLayout(stats));

            this.counters.set(guild.id, {
                channel,
                messageId: message.id,
                lastStats: stats,
                inFlight: null
            });

            await this.persist(guild.id, channel.id, message.id);
            container.logger.info(`[COUNTER] Published in #${channel.name} (${guild.id}) — message ${message.id}.`);
        } finally {
            this.switching.delete(guild.id);
        }
    }

    /** Deletes the published message and forgets the guild. Used by module reset. */
    public async remove(guildId: string): Promise<void> {
        const counter = this.counters.get(guildId);
        if (!counter) return;

        await counter.inFlight?.catch(() => undefined);
        await this.deleteMessage(counter.channel, counter.messageId);
        this.counters.delete(guildId);
    }


    // Loop ──────────

    private async tickAll(): Promise<void> {
        if (this.stopped) return;

        // Picks up guilds that enabled the module after boot, and drops ones
        // whose configuration disappeared.
        if (++this.ticksSinceRescan >= RESCAN_EVERY_TICKS) {
            this.ticksSinceRescan = 0;
            await this.rescan().catch((error) =>
                container.logger.error('[COUNTER] Rescan failed:', error)
            );
        }

        for (const [guildId, counter] of this.counters) {
            if (this.switching.has(guildId) || counter.inFlight !== null) continue;
            void this.tickGuild(guildId, counter);
        }
    }

    private async tickGuild(guildId: string, counter: GuildCounter): Promise<void> {
        // The module can be switched off at any time; Redis is the hot path for
        // that flag, so checking it costs nothing.
        const enabled = await container.redis.get(`counter:module:${guildId}`);
        if (enabled !== 'true') return;

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;

        let stats: CounterStats;
        try {
            stats = await collectStats(guild);
        } catch (error) {
            container.logger.error(`[COUNTER] Could not collect stats for ${guildId}:`, error);
            return;
        }

        // Nothing moved — skip the edit entirely.
        if (counter.lastStats !== null && statsEqual(counter.lastStats, stats)) return;

        const pending = this.update(counter, stats);
        counter.inFlight = pending;

        try {
            await pending;
            // Only committed on success, so a failure retries next tick.
            counter.lastStats = stats;
        } catch (error) {
            container.logger.error(`[COUNTER] Could not update the counter for ${guildId}:`, error);
        } finally {
            counter.inFlight = null;
        }
    }

    private async update(counter: GuildCounter, stats: CounterStats): Promise<void> {
        const layout = getCounterLayout(stats);

        if (counter.messageId === null) {
            const message = await counter.channel.send(layout);
            counter.messageId = message.id;
            await this.persist(counter.channel.guildId, counter.channel.id, message.id);
            return;
        }

        try {
            await counter.channel.messages.edit(counter.messageId, layout);
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage) {
                container.logger.warn('[COUNTER] Message was deleted; republishing.');
                const message = await counter.channel.send(layout);
                counter.messageId = message.id;
                await this.persist(counter.channel.guildId, counter.channel.id, message.id);
                return;
            }

            throw error;
        }
    }


    // State ──────────

    /** Loads every guild with the module configured, reusing its message when still there. */
    private async rescan(): Promise<void> {
        const configs = await prisma.guildConfig.findMany({
            where: { counterModule: true, NOT: { counterChannelId: null } }
        });

        const seen = new Set<string>();

        for (const config of configs) {
            if (config.counterChannelId === null) continue;
            seen.add(config.guildId);

            // Already tracked in the right place — leave it alone.
            const existing = this.counters.get(config.guildId);
            if (existing && existing.channel.id === config.counterChannelId) continue;

            const guild = this.client.guilds.cache.get(config.guildId);
            if (!guild) continue;

            const channel = await guild.channels.fetch(config.counterChannelId).catch(() => null);
            if (!isCounterChannel(channel)) {
                container.logger.warn(
                    `[COUNTER] Configured channel ${config.counterChannelId} for ${config.guildId} is gone; clearing.`
                );
                await this.persist(config.guildId, null, null);
                this.counters.delete(config.guildId);
                continue;
            }

            this.counters.set(config.guildId, {
                channel,
                messageId: config.counterMessageId,
                lastStats: null,
                inFlight: null
            });
        }

        // Guilds that were turned off or reset while we were running.
        for (const guildId of [...this.counters.keys()]) {
            if (!seen.has(guildId)) this.counters.delete(guildId);
        }
    }

    /**
     * Upsert, not update: setup publishes the message before the config row is
     * written, so the row may not exist yet the first time round.
     */
    private async persist(guildId: string, channelId: string | null, messageId: string | null): Promise<void> {
        const data = { counterChannelId: channelId, counterMessageId: messageId };
        const updated = await prisma.guildConfig.upsert({
            where: { guildId },
            create: { guildId, ...data },
            update: data
        });
        await CacheManager.syncGuild(guildId, updated);
    }

    /** Best effort: a failed delete should not block a channel change. */
    private async deleteMessage(channel: CounterChannel, messageId: string | null): Promise<void> {
        if (messageId === null) return;

        try {
            await channel.messages.delete(messageId);
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownMessage) return;
            container.logger.warn('[COUNTER] Could not delete the previous message:', error);
        }
    }
}
