import { Command } from '@sapphire/framework';

async function getSpotifyOEmbedTrack(query: string): Promise<{ title: string; author: string } | null> {
    try {
        const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json() as { title?: string; author_name?: string };
        if (!data.title) return null;

        return {
            title: data.title.trim(),
            author: (data.author_name ?? '').trim()
        };
    } catch {
        return null;
    }
}

export function isSpotifyCollectionUrl(query: string): boolean {
    return /open\.spotify\.com\/(playlist|album)\//i.test(query);
}

export async function resolveWithSpotifyFallback(command: Command, node: any, query: string) {
    const primary = await node.rest.resolve(query).catch(() => null);

    const isSpotifyTrackUrl = /open\.spotify\.com\/track\//i.test(query);
    const isSpotifyCollection = isSpotifyCollectionUrl(query);
    if (!isSpotifyTrackUrl && !isSpotifyCollection) return primary;

    if (!primary || primary.loadType === 'error' || primary.loadType === 'empty') {
        const oembed = await getSpotifyOEmbedTrack(query);
        if (!oembed) return primary;

        const fallbackQuery = isSpotifyCollection
            ? `ytsearch:${oembed.title}`.trim()
            : `ytsearch:${oembed.author} ${oembed.title}`.trim();

        const fallback = await node.rest.resolve(fallbackQuery).catch(() => null);

        if (fallback && (fallback.loadType === 'search' || fallback.loadType === 'track')) {
            command.container.logger.warn(`[MUSIC] Spotify URL fallback used. Query: "${query}" -> "${fallbackQuery}"`);
            return fallback;
        }
    }

    return primary;
}

export async function resolveSearchWithFallback(command: Command, node: any, query: string) {
    const spotify = await node.rest.resolve(`spsearch:${query}`).catch(() => null);

    if (spotify && spotify.loadType !== 'error' && spotify.loadType !== 'empty') {
        return spotify;
    }

    command.container.logger.warn(`[MUSIC] spsearch failed for "${query}", falling back to ytsearch.`);
    return node.rest.resolve(`ytsearch:${query}`).catch(() => null);
}
