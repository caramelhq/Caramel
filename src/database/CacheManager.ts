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
            pipeline.set(`mod:warn_expiration_days:${guildId}`, String(config.warnExpirationDays));
            pipeline.set(`mod:threshold_mode:${guildId}`, config.thresholdMode);


            // AutoMod module ──────────

            pipeline.set(`automod:module:${guildId}`, String(config.automodModule));


            // General ──────────

            pipeline.set(`general:locale:${guildId}`, (config as any).locale);
            pipeline.set(`general:prefix:${guildId}`, (config as any).prefix);

            await pipeline.exec();
        } catch (error) {
            logger.error(`[CACHE_MANAGER] Failed to sync guild ${guildId}:`, error);
        }
    }


    /**
     * Syncs AutoMod rules for a guild to Redis.
     * Uses sets for WORDS rules and standard keys for others.
     */
    public static async syncAutoModRules(guildId: string, rules: any[]) {
        const { redis, logger } = container;
        const pipeline = redis.pipeline();

        try {
            // 1. Clear existing rules in cache for this guild
            const oldKeys = await redis.keys(`automod:rules:${guildId}:*`);
            if (oldKeys.length) await redis.del(...oldKeys);

            // 2. Add new rules
            for (const rule of rules) {
                if (!rule.enabled) continue;

                const ruleKey = `automod:rules:${guildId}:${rule.type}:${rule.id}`;
                
                // For WORDS, we store them in a Set for O(1) lookup
                if (rule.type === 'WORDS' && rule.content.length > 0) {
                    pipeline.sadd(`automod:words:${guildId}:${rule.id}`, ...rule.content);
                    pipeline.set(ruleKey, JSON.stringify({ action: rule.action, id: rule.id }));
                } else {
                    // For other types, we store the full rule config
                    pipeline.set(ruleKey, JSON.stringify({
                        action: rule.action,
                        id: rule.id,
                        content: rule.content,
                        threshold: rule.threshold,
                        whitelist: rule.whitelist
                    }));
                }
            }

            await pipeline.exec();
        } catch (error) {
            logger.error(`[CACHE_MANAGER] Failed to sync AutoMod rules for guild ${guildId}:`, error);
        }
    }


    // Returns the cached AutoMod rules for a guild ──────────

    public static async getAutoModConfig(guildId: string) {
        const { redis } = container;
        const enabled = await redis.get(`automod:module:${guildId}`);
        return { automodModule: enabled === 'true' };
    }


    /**
     * Retrieves all active AutoMod rules for a guild from cache
     */
    public static async getAutoModRules(guildId: string): Promise<any[]> {
        const { redis } = container;
        const keys = await redis.keys(`automod:rules:${guildId}:*`);
        if (!keys.length) return [];

        const rulesData = await redis.mget(...keys);
        return rulesData.map((data, index) => {
            const parsed = JSON.parse(data!);
            const keyParts = keys[index].split(':');
            return {
                ...parsed,
                type: keyParts[3] // The type is part of the key structure
            };
        });
    }


    /**
     * Checks if a word is in a banned words list for a specific rule
     */
    public static async isBannedWord(guildId: string, ruleId: number, word: string): Promise<boolean> {
        const { redis } = container;
        return (await redis.sismember(`automod:words:${guildId}:${ruleId}`, word)) === 1;
    }


    // Returns the cached mod config for a guild ──────────

    public static async getModConfig(guildId: string) {
        const { redis } = container;
        const [logChannel, modModule, thresholdsEnabled, muteThreshold, banThreshold, mutedRole, expirationDays, thresholdMode] = await redis.mget(
            `mod:log_channel:${guildId}`,
            `mod:module:${guildId}`,
            `mod:thresholds_enabled:${guildId}`,
            `mod:mute_threshold:${guildId}`,
            `mod:ban_threshold:${guildId}`,
            `mod:muted_role:${guildId}`,
            `mod:warn_expiration_days:${guildId}`,
            `mod:threshold_mode:${guildId}`
        );

        return {
            modLogChannelId:      logChannel ?? null,
            modModule:            modModule === 'true',
            modThresholdsEnabled: thresholdsEnabled === 'true',
            muteThreshold:        muteThreshold  ? parseInt(muteThreshold)  : 3,
            banThreshold:         banThreshold   ? parseInt(banThreshold)   : 5,
            mutedRoleId:          mutedRole ?? null,
            warnExpirationDays:   expirationDays ? parseInt(expirationDays) : 0,
            thresholdMode:        thresholdMode ?? 'modular'
        };
    }


    public static async getLocale(guildId: string) {
        const { redis } = container;
        const locale = await redis.get(`general:locale:${guildId}`);
        return locale ?? 'en-US';
    }


    public static async getPrefix(guildId: string) {
        const { redis } = container;
        const prefix = await redis.get(`general:prefix:${guildId}`);
        return prefix ?? process.env.PREFIX ?? 'c!';
    }


    // Deletes all cached keys for a guild ──────────

    public static async clearGuild(guildId: string) {
        const { redis } = container;
        const keys = await redis.keys(`*:${guildId}`);
        if (keys.length > 0) await redis.del(...keys);
    }
}
