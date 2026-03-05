import { container } from '@sapphire/framework';
import type { GuildConfig } from '@prisma/client';


// Cache manager ──────────────────

export class CacheManager {

    // Syncs all guild config fields to Redis ──────────

    public static async syncGuild(guildId: string, config: GuildConfig) {
        const { redis, logger } = container;
        const pipeline = redis.pipeline();

        try {

            // Vanity module ──────────

            if (config.vanityString) pipeline.set(`vanity:string:${guildId}`, config.vanityString);
            else pipeline.del(`vanity:string:${guildId}`);

            if (config.vanityRoleId) pipeline.set(`vanity:role:${guildId}`, config.vanityRoleId);
            else pipeline.del(`vanity:role:${guildId}`);

            if (config.vanityChannelId) pipeline.set(`vanity:channel:${guildId}`, config.vanityChannelId);
            else pipeline.del(`vanity:channel:${guildId}`);

            pipeline.set(`vanity:module:${guildId}`, String(config.vanityModule));


            // Mod module ──────────

            if (config.modLogChannelId) pipeline.set(`mod:log_channel:${guildId}`, config.modLogChannelId);
            else pipeline.del(`mod:log_channel:${guildId}`);

            if (config.mutedRoleId) pipeline.set(`mod:muted_role:${guildId}`, config.mutedRoleId);
            else pipeline.del(`mod:muted_role:${guildId}`);

            pipeline.set(`mod:module:${guildId}`, String(config.modModule));
            pipeline.set(`mod:thresholds_enabled:${guildId}`, String(config.modThresholdsEnabled));
            pipeline.set(`mod:mute_threshold:${guildId}`, String(config.muteThreshold));
            pipeline.set(`mod:ban_threshold:${guildId}`, String(config.banThreshold));

            await pipeline.exec();
        } catch (error) {
            logger.error(`[CACHE_MANAGER] Failed to sync guild ${guildId}:`, error);
        }
    }


    // Returns the cached mod config for a guild ──────────

    public static async getModConfig(guildId: string) {
        const { redis } = container;
        const [logChannel, modModule, thresholdsEnabled, muteThreshold, banThreshold, mutedRole] = await redis.mget(
            `mod:log_channel:${guildId}`,
            `mod:module:${guildId}`,
            `mod:thresholds_enabled:${guildId}`,
            `mod:mute_threshold:${guildId}`,
            `mod:ban_threshold:${guildId}`,
            `mod:muted_role:${guildId}`
        );

        return {
            modLogChannelId:      logChannel ?? null,
            modModule:            modModule === 'true',
            modThresholdsEnabled: thresholdsEnabled === 'true',
            muteThreshold:        muteThreshold ? parseInt(muteThreshold) : 3,
            banThreshold:         banThreshold  ? parseInt(banThreshold)  : 5,
            mutedRoleId:          mutedRole ?? null,
        };
    }


    // Deletes all cached keys for a guild ──────────

    public static async clearGuild(guildId: string) {
        const { redis } = container;
        const keys = await redis.keys(`*:${guildId}`);
        if (keys.length > 0) await redis.del(...keys);
    }
}