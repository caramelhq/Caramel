// External lyrics source endpoint.
const LRCLIB_API = 'https://lrclib.net/api/search';

type LrclibMatch = {
    trackName?: string;
    plainLyrics?: string;
    syncedLyrics?: string;
};

export type LyricsSearchResult = {
    title: string;
    pages: string[];
};

export async function searchLyricsPages(searchTitle: string): Promise<LyricsSearchResult | null> {
    const response = await fetch(`${LRCLIB_API}?q=${encodeURIComponent(searchTitle)}`);
    const data = (await response.json()) as LrclibMatch[];

    if (!Array.isArray(data) || data.length === 0) {
        return null;
    }

    const bestMatch = data.find((entry) => entry.syncedLyrics) ?? data[0];
    if (!bestMatch) {
        return null;
    }

    const plainLyrics = bestMatch.plainLyrics?.trim();
    const syncedLyrics = bestMatch.syncedLyrics?.replace(/\[\d+:\d+.\d+\]/g, '').trim();
    const lyricsText = plainLyrics || syncedLyrics;

    if (!lyricsText) {
        return null;
    }

    return {
        title: bestMatch.trackName || searchTitle,
        pages: paginateLyrics(lyricsText)
    };
}

export function paginateLyrics(text: string): string[] {
    const lines = text.split('\n');
    const pages: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
        if ((currentChunk + line).length > 800) {
            pages.push(currentChunk.trim());
            currentChunk = '';
        }

        currentChunk += `${line}\n`;
    }

    if (currentChunk.trim()) {
        pages.push(currentChunk.trim());
    }

    return pages;
}
