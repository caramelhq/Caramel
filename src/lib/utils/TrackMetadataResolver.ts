import { cleanTrackTitle } from './MusicUtils';

type ExternalTrackMetadata = {
    title: string;
    author: string;
    album?: string;
    artworkUrl?: string;
    source: 'apple' | 'deezer' | 'spotify';
    sourceUrl?: string;
};

function normalizeQuery(title: string, author: string): string {
    const cleanedTitle = cleanTrackTitle(title, author).replace(/[\[\(].*?[\]\)]/g, '').trim();
    const cleanedAuthor = author.replace(/\s*-\s*topic$/i, '').trim();
    return `${cleanedAuthor} ${cleanedTitle}`.trim();
}

async function fetchItunesMetadata(term: string): Promise<ExternalTrackMetadata | null> {
    try {
        const url = new URL('https://itunes.apple.com/search');
        url.searchParams.set('term', term);
        url.searchParams.set('media', 'music');
        url.searchParams.set('entity', 'song');
        url.searchParams.set('limit', '1');

        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) return null;

        const data = await response.json() as {
            resultCount?: number;
            results?: Array<{
                trackName?: string;
                artistName?: string;
                collectionName?: string;
                artworkUrl100?: string;
                trackViewUrl?: string;
            }>;
        };

        const item = data.results?.[0];
        if (!item?.trackName || !item.artistName) return null;

        const artwork = item.artworkUrl100?.replace(/100x100bb/i, '600x600bb');
        return {
            title: item.trackName,
            author: item.artistName,
            album: item.collectionName,
            artworkUrl: artwork,
            source: 'apple',
            sourceUrl: item.trackViewUrl
        };
    } catch {
        return null;
    }
}

async function fetchDeezerMetadata(term: string): Promise<ExternalTrackMetadata | null> {
    try {
        const url = new URL('https://api.deezer.com/search');
        url.searchParams.set('q', term);
        url.searchParams.set('limit', '1');

        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) return null;

        const data = await response.json() as {
            data?: Array<{
                title?: string;
                artist?: { name?: string };
                album?: { title?: string; cover_xl?: string; cover_big?: string };
                link?: string;
            }>;
        };

        const item = data.data?.[0];
        if (!item?.title || !item.artist?.name) return null;

        return {
            title: item.title,
            author: item.artist.name,
            album: item.album?.title,
            artworkUrl: item.album?.cover_xl ?? item.album?.cover_big,
            source: 'deezer',
            sourceUrl: item.link
        };
    } catch {
        return null;
    }
}

async function fetchSpotifyOEmbedMetadata(url: string): Promise<ExternalTrackMetadata | null> {
    try {
        const endpoint = new URL('https://open.spotify.com/oembed');
        endpoint.searchParams.set('url', url);

        const response = await fetch(endpoint, { method: 'GET' });
        if (!response.ok) return null;

        const data = await response.json() as {
            title?: string;
            author_name?: string;
            thumbnail_url?: string;
        };

        if (!data.title || !data.author_name) return null;

        return {
            title: data.title,
            author: data.author_name,
            artworkUrl: data.thumbnail_url,
            source: 'spotify',
            sourceUrl: url
        };
    } catch {
        return null;
    }
}

export async function resolveExternalMetadata(params: {
    title: string;
    author: string;
    originalUrl?: string;
}): Promise<ExternalTrackMetadata | null> {
    const originalUrl = params.originalUrl ?? '';

    if (/open\.spotify\.com\/track\//i.test(originalUrl)) {
        const spotifyData = await fetchSpotifyOEmbedMetadata(originalUrl);
        if (spotifyData) return spotifyData;
    }

    const term = normalizeQuery(params.title, params.author);
    const apple = await fetchItunesMetadata(term);
    if (apple) return apple;

    const deezer = await fetchDeezerMetadata(term);
    if (deezer) return deezer;

    return null;
}

export async function attachExternalMetadataToTrack<T extends { info?: any }>(track: T, originalUrl?: string): Promise<T> {
    if (!track?.info) return track;

    const metadata = await resolveExternalMetadata({
        title: track.info.title ?? '',
        author: track.info.author ?? '',
        originalUrl: originalUrl ?? track.info.uri
    });

    if (!metadata) return track;

    (track as any).displayMetadata = metadata;
    return track;
}

export function getTrackDisplayMetadata(track: any): {
    title: string;
    author: string;
    album?: string;
    artworkUrl?: string;
    source?: string;
} {
    const external = (track as any)?.displayMetadata as ExternalTrackMetadata | undefined;

    return {
        title: external?.title ?? track?.info?.title ?? 'Unknown',
        author: external?.author ?? track?.info?.author ?? 'Unknown',
        album: external?.album ?? track?.info?.albumName ?? track?.pluginInfo?.albumName,
        artworkUrl: external?.artworkUrl ?? track?.info?.artworkUrl,
        source: external?.source
    };
}
