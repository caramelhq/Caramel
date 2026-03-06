import { redis } from "@/lib/redis";

import type { GuildConfig } from "@prisma/client";

// Mirrors the bot's CacheManager.syncGuild — must stay in sync with
// src/database/CacheManager.ts in the bot repo.

export async function syncGuildCache(guildId: string, config: GuildConfig) {
    const pipeline = redis.pipeline();

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
}
