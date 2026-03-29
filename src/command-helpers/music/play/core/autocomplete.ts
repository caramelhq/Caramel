import { Command } from '@sapphire/framework';
import { CacheManager } from '../../../../database/CacheManager';
import { cleanTrackTitle, formatDuration } from '../../../../lib/utils/MusicUtils';

// ─── In-process caches ────────────────────────────────────────────────────────
// These sit in front of Redis so repeated keystrokes never touch the network.

const SEARCH_MEM_TTL = 30_000;   // 30s — user is actively searching
const FAV_MEM_TTL    = 300_000;  // 5min — favorites change rarely

const searchCache = new Map<string, { data: any[]; exp: number }>();
const favCache    = new Map<string, { data: any[]; exp: number }>();

// In-flight deduplication — if the same query is already resolving, reuse the promise
const searchInFlight = new Map<string, Promise<any[]>>();
const favInFlight    = new Map<string, Promise<any[]>>();

// ─── Cache helpers ────────────────────────────────────────────────────────────

function getSearch(key: string): any[] | null {
    const e = searchCache.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) { searchCache.delete(key); return null; }
    return e.data;
}

function setSearch(key: string, data: any[]) {
    searchCache.set(key, { data, exp: Date.now() + SEARCH_MEM_TTL });
}

/**
 * Stale-while-revalidate: return the longest cached prefix of the current query.
 * e.g. if "taylor" is cached and user types "taylor s" → return "taylor" instantly.
 */
function getStalePrefixResults(query: string): any[] | null {
    for (let len = query.length - 1; len >= 2; len--) {
        const hit = getSearch(query.slice(0, len));
        if (hit) return hit;
    }
    return null;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

async function fetchFavorites(command: Command, userId: string): Promise<any[]> {
    // L1: memory
    const mem = favCache.get(userId);
    if (mem && Date.now() <= mem.exp) return mem.data;

    // In-flight dedup
    const existing = favInFlight.get(userId);
    if (existing) return existing;

    const p = (async () => {
        // L2: Redis
        const cached = await CacheManager.getUserFavorites(userId).catch(() => null);
        if (cached) {
            favCache.set(userId, { data: cached, exp: Date.now() + FAV_MEM_TTL });
            return cached;
        }

        // L3: DB
        const fromDb = await command.container.db.userFavorite.findMany({
            where: { userId },
            take: 10,
            orderBy: { createdAt: 'desc' }
        }).catch(() => [] as any[]);

        favCache.set(userId, { data: fromDb, exp: Date.now() + FAV_MEM_TTL });
        CacheManager.setUserFavorites(userId, fromDb).catch(() => null);
        return fromDb;
    })().finally(() => favInFlight.delete(userId));

    favInFlight.set(userId, p);
    return p;
}

// ─── Search ───────────────────────────────────────────────────────────────────

function parseResult(result: any, query: string): any[] {
    if (!result) return [];
    if (result.loadType === 'track') return [result.data];
    if (result.loadType === 'search') return Array.isArray(result.data) ? result.data : [];
    if (result.loadType === 'playlist') {
        const pl = result.data as any;
        return [{
            info: { title: `📁 ${pl.info.name}`, author: `Playlist · ${pl.tracks.length} tracks`, uri: query, length: 0 },
            isPlaylist: true
        }];
    }
    return [];
}

async function fetchSearch(command: Command, query: string): Promise<any[]> {
    const key = query.toLowerCase();

    // L1: memory
    const mem = getSearch(key);
    if (mem) return mem;

    // In-flight dedup
    const existing = searchInFlight.get(key);
    if (existing) return existing;

    const p = (async () => {
        // L2: Redis
        const cached = await CacheManager.getSearchResult(query).catch(() => null);
        if (cached) { setSearch(key, cached); return cached; }

        // L3: Lavalink — spsearch only, no YouTube fallback (speed > completeness for autocomplete)
        const node = command.container.music.options.nodeResolver(command.container.music.nodes);
        if (!node) return [];

        const result = await node.rest.resolve(`spsearch:${query}`).catch(() => null);
        const tracks = parseResult(result, query);

        setSearch(key, tracks);
        CacheManager.setSearchResult(query, tracks).catch(() => null);
        return tracks;
    })().finally(() => searchInFlight.delete(key));

    searchInFlight.set(key, p);
    return p;
}

async function fetchUrl(command: Command, url: string): Promise<any[]> {
    const key = url.toLowerCase();
    const mem = getSearch(key);
    if (mem) return mem;

    const node = command.container.music.options.nodeResolver(command.container.music.nodes);
    if (!node) return [];

    const result = await node.rest.resolve(url).catch(() => null);
    const tracks = parseResult(result, url);
    setSearch(key, tracks);
    return tracks;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getPlayAutocompleteChoices(command: Command, userId: string, query: string): Promise<Array<{ name: string; value: string }>> {
    const lowerQuery = query.toLowerCase();
    const isUrl      = query.startsWith('http');
    const hasQuery   = query.length >= 2 && !isUrl;

    // For text queries: check if we have any cached prefix result to return immediately.
    // If yes, return it now and kick off the actual query in background.
    // This makes every keystroke after the first cached one feel instant.
    const stale = hasQuery ? getStalePrefixResults(lowerQuery) : null;

    const [favorites, searchResults] = await Promise.all([
        fetchFavorites(command, userId),
        hasQuery
            ? stale
                ? (fetchSearch(command, query).catch(() => null), Promise.resolve(stale))
                : fetchSearch(command, query)
            : isUrl
                ? fetchUrl(command, query)
                : Promise.resolve([])
    ]);

    const filteredFavorites = lowerQuery
        ? favorites.filter(f =>
            f.trackTitle.toLowerCase().includes(lowerQuery) ||
            f.author.toLowerCase().includes(lowerQuery)
        )
        : favorites;

    // Merge: favorites first, then search results, de-duplicated by URL
    const favoriteUrls = new Set(favorites.map((f: any) => f.trackUrl));
    const out: Array<{ name: string; value: string }> = [];

    for (const fav of filteredFavorites) {
        if (out.length >= 10) break;
        const title    = fav.trackTitle.length > 40 ? `${fav.trackTitle.slice(0, 37)}...` : fav.trackTitle;
        const author   = fav.author.length > 25     ? `${fav.author.slice(0, 22)}...`     : fav.author;
        const duration = fav.trackDuration           ? ` · ${fav.trackDuration}`            : '';
        out.push({ name: `❤️ ${title} — ${author}${duration}`, value: fav.trackUrl });
    }

    for (const track of searchResults) {
        if (out.length >= 10) break;
        if (favoriteUrls.has(track.info?.uri)) continue;

        if ((track as any).isPlaylist) {
            out.push({ name: track.info.title, value: track.info.uri });
            continue;
        }

        const cleanedTitle = cleanTrackTitle(track.info.title, track.info.author);
        const title        = cleanedTitle.length > 40          ? `${cleanedTitle.slice(0, 37)}...`     : cleanedTitle;
        const author       = track.info.author.length > 25     ? `${track.info.author.slice(0, 22)}...` : track.info.author;
        const duration     = track.info.length > 0             ? ` · ${formatDuration(track.info.length)}` : '';
        out.push({ name: `🎵 ${title} — ${author}${duration}`, value: track.info.uri });
    }

    return out.slice(0, 10);
}
