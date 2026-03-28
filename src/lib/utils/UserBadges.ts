import { GuildMember, User, UserFlags } from 'discord.js';
import { Emojis } from '../constants/emojis.js';

// Maps Discord UserFlags to their badge emoji.
// ActiveDeveloper excluded — Discord removed the badge.
const FLAG_EMOJIS: Array<[UserFlags, string]> = [
    [UserFlags.Staff,                 Emojis.discord_staff_emoji],
    [UserFlags.Partner,               Emojis.discord_partner_emoji],
    [UserFlags.Hypesquad,             Emojis.hypesquad_events_emoji],
    [UserFlags.BugHunterLevel1,       Emojis.bug_hunter_emoji],
    [UserFlags.BugHunterLevel2,       Emojis.bug_hunter_gold_emoji],
    [UserFlags.HypeSquadOnlineHouse1, Emojis.hypesquad_bravery_emoji],
    [UserFlags.HypeSquadOnlineHouse2, Emojis.hypesquad_brilliance_emoji],
    [UserFlags.HypeSquadOnlineHouse3, Emojis.hypesquad_balance_emoji],
    [UserFlags.PremiumEarlySupporter, Emojis.early_supporter_emoji],
    [UserFlags.VerifiedDeveloper,     Emojis.verified_developer_emoji],
    [UserFlags.CertifiedModerator,    Emojis.moderator_alumni_emoji],
];

/**
 * Returns the Nitro anniversary tier emoji based on months subscribed.
 * Progression: Bronze → Silver → Gold → Platinum → Diamond → Emerald → Ruby → Opal
 */
function getNitroAnniversaryEmoji(premiumSince: Date): string {
    const months = Math.floor((Date.now() - premiumSince.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months >= 72) return Emojis.nitro_anniversary_opal_emoji;
    if (months >= 60) return Emojis.nitro_anniversary_ruby_emoji;
    if (months >= 36) return Emojis.nitro_anniversary_emerald_emoji;
    if (months >= 24) return Emojis.nitro_anniversary_diamond_emoji;
    if (months >= 12) return Emojis.nitro_anniversary_platinum_emoji;
    if (months >= 6)  return Emojis.nitro_anniversary_gold_emoji;
    if (months >= 3)  return Emojis.nitro_anniversary_silver_emoji;
    return Emojis.nitro_anniversary_bronze_emoji;
}

/**
 * Returns the server booster badge tier emoji based on months boosting.
 */
function getBoosterEmoji(premiumSince: Date): string {
    const months = Math.floor((Date.now() - premiumSince.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months >= 24) return Emojis.nitro_boost_24m_emoji;
    if (months >= 18) return Emojis.nitro_boost_18m_emoji;
    if (months >= 15) return Emojis.nitro_boost_15m_emoji;
    if (months >= 12) return Emojis.nitro_boost_12m_emoji;
    if (months >= 9)  return Emojis.nitro_boost_9m_emoji;
    if (months >= 6)  return Emojis.nitro_boost_6m_emoji;
    if (months >= 3)  return Emojis.nitro_boost_3m_emoji;
    if (months >= 2)  return Emojis.nitro_boost_2m_emoji;
    return Emojis.nitro_boost_1m_emoji;
}

/**
 * Tries to read premium_since from the user's raw API data.
 * Discord exposes this field when the bot is installed as a user app
 * and the user invokes a command in that context — the interaction payload
 * carries a richer user object that includes premium_since.
 * In standard guild-bot context this will be null.
 */
function getRawPremiumSince(user: User): Date | null {
    const raw = (user as any)._rawData ?? (user as any).rawData;
    const value = raw?.premium_since ?? null;
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Returns a space-separated string of badge emojis for a user.
 * Returns an empty string if the user has no displayable badges.
 *
 * Nitro anniversary tier: shown when premium_since is available (user-install context).
 * Fallback: nitro_emoji when the user has Nitro but no tier data.
 */
export function getBadgesStr(user: User, member?: GuildMember | null): string {
    const badges: string[] = [];

    // Standard UserFlags badges
    if (user.flags) {
        for (const [flag, emoji] of FLAG_EMOJIS) {
            if (user.flags.has(flag)) badges.push(emoji);
        }
    }

    // Nitro badge: anniversary tier if premium_since is available, generic badge otherwise
    if (user.premiumType && user.premiumType > 0) {
        const premiumSince = getRawPremiumSince(user);
        badges.push(premiumSince ? getNitroAnniversaryEmoji(premiumSince) : Emojis.nitro_emoji);
    }

    // Server booster badge with tier based on boost duration
    if (member?.premiumSince) {
        badges.push(getBoosterEmoji(member.premiumSince));
    }

    return badges.join(' ');
}
