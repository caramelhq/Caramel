import { container } from '@sapphire/framework';
import { MusicPlayer } from '../structures/MusicPlayer';

export class MusicRestorer {
    /**
     * Attempts to restore all music sessions from Redis.
     */
    public static async restore() {
        const { redis, music, logger } = container;

        try {
            // Find all active music states
            const keys = await redis.keys('music:state:*');
            if (keys.length === 0) return;

            logger.info(`🎵 [REHYDRATION] Found ${keys.length} music sessions to restore.`);

            for (const key of keys) {
                try {
                    const data = await redis.get(key);
                    if (!data) continue;

                    const state = JSON.parse(data);
                    const { guildId, textChannelId, voiceChannelId, lastMessageId, loop, autoplay, current, queue, isPaused, position, timestamp } = state;

                    // Verify guild exists in cache
                    const guild = await container.client.guilds.fetch(guildId).catch(() => null);
                    if (!guild) {
                        logger.warn(`⚠️ [REHYDRATION] Could not restore session for guild ${guildId}: Guild not found.`);
                        await redis.del(key);
                        continue;
                    }

                    // 1. Check if Shoukaku ALREADY restored the player automatically via resumeKey
                    let player = music.players.get(guildId);

                    // A stale player can remain after node re-add and produce /sessions/null REST calls.
                    if (player && (!player.node?.sessionId || player.node.state !== 1)) {
                        await player.destroy().catch(() => null);
                        await music.leaveVoiceChannel(guildId).catch(() => null);
                        player = null as any;
                    }

                    if (!player) {
                        // If not, join voice channel as fallback
                        player = await music.joinVoiceChannel({
                            guildId,
                            channelId: voiceChannelId,
                            shardId: guild.shardId,
                            deaf: true
                        }).catch(() => null) as any;
                    }

                    if (!player) {
                        await redis.del(key);
                        continue;
                    }

                    // Recreate MusicPlayer instance immediately
                    const musicPlayer = new MusicPlayer(guildId, player, {
                        queue,
                        current,
                        loop,
                        autoplay,
                        textChannelId,
                        lastMessageId,
                        isPaused
                    });

                    // Add to manager
                    music.queues.set(guildId, musicPlayer);
                    
                    // Pure Real-Time Sync Logic ──────────
                    if (current) {
                        const now = Date.now();
                        const elapsedSinceDeath = now - (timestamp ?? now);
                        const realTimePosition = (position ?? 0) + elapsedSinceDeath;

                        // Give it a tiny moment to sync internal state
                        await new Promise(resolve => setTimeout(resolve, 200));

                        // 2. Check if Lavalink ALREADY has the correct track playing
                        // Verify backend player/session state first to avoid stale local player illusions.
                        const backendPlayer = await player.node.rest.getPlayer(guildId).catch(() => null);
                        const backendTrackEncoded = backendPlayer?.track?.encoded ?? null;

                        // player.track in Shoukaku can be stale after reconnect edge cases.
                        const isLavalinkPlayingCorrectTrack = backendTrackEncoded === current.encoded;
                        const currentPosition = player.position ?? 0;
                        const drift = Math.abs(currentPosition - realTimePosition);
                        const hasActivePlaybackSignal = backendTrackEncoded !== null && (currentPosition > 0 || !player.paused);

                        if (isLavalinkPlayingCorrectTrack && hasActivePlaybackSignal && drift < 3000) {
                            logger.info(`✨ [REHYDRATION] ${guild.name}: Zero-latency takeover. Session was alive! Drift: ${drift}ms.`);
                            musicPlayer.isRehydrating = false;
                            continue; 
                        }

                        // 3. If track is correct but drift is high, seek silently
                        if (isLavalinkPlayingCorrectTrack && hasActivePlaybackSignal && drift >= 3000) {
                            logger.info(`⏩ [REHYDRATION] ${guild.name}: Correcting drift (${drift}ms).`);
                            await player.seekTo(realTimePosition).catch(() => null);
                            musicPlayer.isRehydrating = false;
                            continue;
                        }

                        // 4. ONLY if session is truly lost, perform silent restart
                        if (current.info.length && realTimePosition < current.info.length) {
                            await player.setGlobalVolume(0).catch(() => null);
                            
                            logger.info(`🚀 [REHYDRATION] ${guild.name}: Session truly lost, silent recovery at ${realTimePosition}ms`);
                            await player.playTrack({ track: { encoded: current.encoded } }).catch(() => null);
                            
                            setTimeout(async () => {
                                await player.seekTo(realTimePosition).catch(() => null);
                                await player.setGlobalVolume(100).catch(() => null);
                            }, 800);
                        } else {
                            musicPlayer.isRehydrating = false;
                            await musicPlayer.playNext();
                        }
                    }

                    // Turn off rehydration flag after events settle
                    setTimeout(() => {
                        musicPlayer.isRehydrating = false;
                        logger.info(`✅ [REHYDRATION] ${guild.name}: Fully restored.`);
                    }, 2000);
                    
                    logger.info(`✅ [REHYDRATION] Restored session for ${guild.name} (${guildId}).`);

                    // Small delay to prevent hitting rate limits if many sessions are being restored
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (err) {
                    logger.error(`❌ [REHYDRATION] Error restoring session from key ${key}:`, err);
                }
            }
        } catch (err) {
            logger.error('❌ [REHYDRATION] Critical error during music restoration:', err);
        }
    }
}
