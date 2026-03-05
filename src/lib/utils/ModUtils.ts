import { container } from '@sapphire/framework';
import { Guild, TextChannel } from 'discord.js';
import { prisma } from '../../database/db';
import { CacheManager } from '../../database/CacheManager';
import { getModLogLayout, getModDMLayout, type ModAction } from './layouts';


// Mod utils ──────────────────

// Sends a DM to the sanctioned user ──────────

export async function sendModDM(data: {
    userId: string,
    action: ModAction,
    guildName: string,
    reason?: string | null,
    duration?: string | null
}) {
    try {
        const user = await container.client.users.fetch(data.userId);
        await user.send({ ...getModDMLayout({
            action: data.action,
            guildName: data.guildName,
            reason: data.reason,
            duration: data.duration
        }) });
    } catch {
        container.logger.warn(`[MOD_UTILS] Could not send DM to ${data.userId}`);
    }
}


// Saves the sanction to ModLog and sends embed to the log channel ──────────

export async function sendModLog(data: {
    guildId: string,
    action: ModAction,
    userId: string,
    userTag: string,
    moderatorId: string,
    reason?: string | null,
    duration?: string | null,
    expiresAt?: Date | null,
    warnCount?: number
}) {
    try {
        await prisma.modLog.create({
            data: {
                guildId:     data.guildId,
                userId:      data.userId,
                moderatorId: data.moderatorId,
                action:      data.action,
                reason:      data.reason ?? null,
                duration:    data.duration ?? null,
                expiresAt:   data.expiresAt ?? null,
            }
        });

        const { modLogChannelId } = await CacheManager.getModConfig(data.guildId);
        if (!modLogChannelId) return;

        const channel = await container.client.channels.fetch(modLogChannelId).catch(() => null) as TextChannel | null;
        if (!channel) return;

        await channel.send({ ...getModLogLayout(data) });
    } catch (error) {
        container.logger.error(`[MOD_UTILS] Failed to send mod log:`, error);
    }
}


// Checks warn thresholds and applies automatic sanction if needed ──────────

export async function checkThresholds(data: {
    guildId: string,
    userId: string,
    userTag: string,
    moderatorId: string,
    guild: Guild
}) {
    try {
        const { modThresholdsEnabled, muteThreshold, banThreshold } = await CacheManager.getModConfig(data.guildId);
        if (!modThresholdsEnabled) return;

        const warnCount = await prisma.modLog.count({
            where: { guildId: data.guildId, userId: data.userId, action: 'warn' }
        });

        if (warnCount >= banThreshold) {
            const member = await data.guild.members.fetch(data.userId).catch(() => null);
            if (!member) return;

            await sendModDM({ userId: data.userId, action: 'ban', guildName: data.guild.name, reason: `Automatic ban: reached ${banThreshold} warnings` });
            await member.ban({ reason: `Automatic ban: reached ${banThreshold} warnings` });
            await sendModLog({ ...data, action: 'ban', reason: `Automatic ban: reached ${banThreshold} warnings`, warnCount });

        } else if (warnCount >= muteThreshold) {
            await applyMute({ ...data, reason: `Automatic timeout: reached ${muteThreshold} warnings`, duration: null });
        }
    } catch (error) {
        container.logger.error(`[MOD_UTILS] Threshold check failed:`, error);
    }
}


// Applies a timeout and saves it to ActiveMute ──────────

export async function applyMute(data: {
    guildId: string,
    userId: string,
    userTag: string,
    moderatorId: string,
    guild: Guild,
    reason?: string | null,
    duration?: string | null,
    expiresAt?: Date | null
}) {
    try {
        const member = await data.guild.members.fetch(data.userId).catch(() => null);
        if (!member) return;

        await prisma.activeMute.upsert({
            where:  { mute_guild_user_unique: { guildId: data.guildId, userId: data.userId } },
            create: { guildId: data.guildId, userId: data.userId, moderatorId: data.moderatorId, reason: data.reason ?? null, expiresAt: data.expiresAt ?? null },
            update: { moderatorId: data.moderatorId, reason: data.reason ?? null, expiresAt: data.expiresAt ?? null },
        });

        const timeoutMs = data.expiresAt
            ? data.expiresAt.getTime() - Date.now()
            : 28 * 24 * 60 * 60 * 1000;

        await member.timeout(timeoutMs, data.reason ?? undefined);
        await sendModDM({ userId: data.userId, action: 'timeout', guildName: data.guild.name, reason: data.reason, duration: data.duration });
        await sendModLog({ guildId: data.guildId, action: 'timeout', userId: data.userId, userTag: data.userTag, moderatorId: data.moderatorId, reason: data.reason, duration: data.duration, expiresAt: data.expiresAt });
    } catch (error) {
        container.logger.error(`[MOD_UTILS] Apply mute failed:`, error);
    }
}


// Parses a duration string to milliseconds and expiry date ──────────
// Format: 1d, 2h, 30m, or combined like 1d2h30m

export function parseDuration(input: string): { ms: number, expiresAt: Date, formatted: string } | null {
    const regex = /(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?/i;
    const match = input.match(regex);
    if (!match || (!match[1] && !match[2] && !match[3])) return null;

    const days    = parseInt(match[1] ?? '0');
    const hours   = parseInt(match[2] ?? '0');
    const minutes = parseInt(match[3] ?? '0');

    const ms = (days * 86400 + hours * 3600 + minutes * 60) * 1000;
    if (ms <= 0) return null;

    const parts = [];
    if (days)    parts.push(`${days}d`);
    if (hours)   parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);

    return {
        ms,
        expiresAt: new Date(Date.now() + ms),
        formatted: parts.join(' ')
    };
}