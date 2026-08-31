import { ChannelType, type Guild, type GuildBasedChannel, type NewsChannel, type TextChannel } from 'discord.js';

// Counter stats ──────────────────

export interface CounterStats {
    /** Members not shown as offline. */
    readonly online: number;
    /** Every member of the guild. */
    readonly total: number;
    /** Members sitting in any voice channel. */
    readonly voice: number;
}

/**
 * Where the counter message lives. Only a destination — it never filters a count.
 * Restricted to text and announcement channels because those are the only ones
 * where sending and then editing a persistent message makes sense.
 */
export type CounterChannel = TextChannel | NewsChannel;

export function isCounterChannel(channel: GuildBasedChannel | null): channel is CounterChannel {
    return (
        channel !== null &&
        (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
    );
}


// Collection ──────────────────

/**
 * Online and total come from Discord's approximate counts, which arrive with a
 * plain guild fetch and cost one request. Counting presences out of the member
 * cache would be exact, but it needs every member of the guild resident in
 * memory — untenable past a few thousand members. The tradeoff is that Discord
 * caches these numbers, so they trail reality by a few minutes.
 *
 * Voice is different: the gateway keeps voice states current on its own, so
 * that one is exact and free.
 */
export async function collectStats(guild: Guild): Promise<CounterStats> {
    const fetched = await guild.client.guilds.fetch({
        guild: guild.id,
        withCounts: true,
        force: true
    });

    let voice = 0;
    for (const state of guild.voiceStates.cache.values()) {
        if (state.channelId !== null) voice += 1;
    }

    return {
        // Fall back to what we already know rather than reporting zero when
        // Discord omits the counts.
        online: fetched.approximatePresenceCount ?? 0,
        total: fetched.approximateMemberCount ?? guild.memberCount,
        voice
    };
}

export function statsEqual(a: CounterStats, b: CounterStats): boolean {
    return a.online === b.online && a.total === b.total && a.voice === b.voice;
}
