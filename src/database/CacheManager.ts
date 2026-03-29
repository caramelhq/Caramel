import { container } from '@sapphire/framework';
import type { BotCommander, GuildConfig, ModPermission } from '@prisma/client';
import { MusicCacheTtlSeconds } from '../lib/constants/musicUi';


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


            // Clan Tag module ──────────

            if (config.clanTagString) pipeline.set(`clantag:string:${guildId}`, config.clanTagString);
            else pipeline.del(`clantag:string:${guildId}`);

            if (config.clanTagRoleId) pipeline.set(`clantag:role:${guildId}`, config.clanTagRoleId);
            else pipeline.del(`clantag:role:${guildId}`);

            if (config.clanTagChannelId) pipeline.set(`clantag:channel:${guildId}`, config.clanTagChannelId);
            else pipeline.del(`clantag:channel:${guildId}`);

            pipeline.set(`clantag:module:${guildId}`, String(config.clanTagModule));


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


    // User Favorites (Music) ──────────

    /**
     * Retrieves cached user favorites for music.
     * Returns null if not cached.
     */
    public static async getUserFavorites(userId: string): Promise<any[] | null> {
        const { redis } = container;
        const data = await redis.get(`user:favorites:${userId}`);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Caches user favorites for music with a 24h TTL.
     */
    public static async setUserFavorites(userId: string, favorites: any[]) {
        const { redis } = container;
        await redis.set(`user:favorites:${userId}`, JSON.stringify(favorites), 'EX', MusicCacheTtlSeconds.userFavorites);
    }

    /**
     * Invalidates the user favorites cache.
     */
    public static async invalidateUserFavorites(userId: string) {
        const { redis } = container;
        await redis.del(`user:favorites:${userId}`);
    }


    // Search Results (Music) ──────────

    /**
     * Retrieves cached search results for music.
     */
    public static async getSearchResult(query: string): Promise<any[] | null> {
        const { redis } = container;
        const data = await redis.get(`music:search:${query.toLowerCase()}`);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Caches search results for music with a 5m TTL.
     */
    public static async setSearchResult(query: string, results: any[]) {
        const { redis } = container;
        await redis.set(`music:search:${query.toLowerCase()}`, JSON.stringify(results), 'EX', MusicCacheTtlSeconds.searchResults);
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


    // Mod Permissions ──────────

    /**
     * Returns all ModPermission rows for a guild.
     * Redis key: mod:perms:<guildId> — JSON array, TTL 5 minutes.
     * Always checks cache first before hitting Prisma.
     */
    public static async getModPermissions(guildId: string): Promise<ModPermission[]> {
        const { redis } = container;
        const cached = await redis.get(`mod:perms:${guildId}`);
        if (cached) return JSON.parse(cached);
        const perms = await container.db.modPermission.findMany({ where: { guildId } });
        await redis.set(`mod:perms:${guildId}`, JSON.stringify(perms), 'EX', 300);
        return perms;
    }

    /**
     * Invalidates the mod permissions cache for a guild.
     * Must be called after any upsert/delete on ModPermission.
     */
    public static async invalidateModPermissions(guildId: string): Promise<void> {
        const { redis } = container;
        await redis.del(`mod:perms:${guildId}`);
    }


    // Bot Commanders ──────────

    /**
     * Returns all BotCommander rows for a guild.
     * Redis key: bot:commanders:<guildId> — JSON array, TTL 5 minutes.
     * Always checks cache first before hitting Prisma.
     */
    public static async getBotCommanders(guildId: string): Promise<BotCommander[]> {
        const { redis } = container;
        const cached = await redis.get(`bot:commanders:${guildId}`);
        if (cached) return JSON.parse(cached);
        const commanders = await container.db.botCommander.findMany({ where: { guildId } });
        await redis.set(`bot:commanders:${guildId}`, JSON.stringify(commanders), 'EX', 300);
        return commanders;
    }

    /**
     * Invalidates the bot commanders cache for a guild.
     * Must be called after any upsert/delete on BotCommander.
     */
    public static async invalidateBotCommanders(guildId: string): Promise<void> {
        const { redis } = container;
        await redis.del(`bot:commanders:${guildId}`);
    }


    // Deletes all cached keys for a guild ──────────

    public static async clearGuild(guildId: string) {
        const { redis } = container;
        const keys = await redis.keys(`*:${guildId}`);
        if (keys.length > 0) await redis.del(...keys);
    }
}
