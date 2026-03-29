type ExternalTrackMetadata = {
    title: string;
    author: string;
    album?: string;
    artworkUrl?: string;
    source: 'spotify' | 'youtube';
    sourceUrl?: string;
};

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
        return fetchSpotifyOEmbedMetadata(originalUrl);
    }

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
