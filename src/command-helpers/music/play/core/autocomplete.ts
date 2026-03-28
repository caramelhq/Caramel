import { Command } from '@sapphire/framework';
import { CacheManager } from '../../../../database/CacheManager';
import { cleanTrackTitle, formatDuration } from '../../../../lib/utils/MusicUtils';
import { resolveSearchWithFallback } from './resolver';

export async function getPlayAutocompleteChoices(command: Command, userId: string, query: string): Promise<Array<{ name: string; value: string }>> {
    const lowerQuery = query.toLowerCase();

    // 1) Favorites (cache first)
    let favorites = await CacheManager.getUserFavorites(userId);

    if (!favorites) {
        favorites = await command.container.db.userFavorite.findMany({
            where: { userId },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        await CacheManager.setUserFavorites(userId, favorites);
    }

    const filteredFavorites = lowerQuery
        ? favorites.filter(f =>
            f.trackTitle.toLowerCase().includes(lowerQuery) ||
            f.author.toLowerCase().includes(lowerQuery)
        )
        : favorites;

    // 2) Search results (cache first)
    let searchResults: any[] = [];
    const isUrl = query.startsWith('http');

    if (query && query.length >= 2) {
        const cachedResults = await CacheManager.getSearchResult(query);

        if (cachedResults) {
            searchResults = cachedResults;
        } else {
            const node = command.container.music.options.nodeResolver(command.container.music.nodes);
            if (node) {
                const result = isUrl
                    ? await node.rest.resolve(query).catch(() => null)
                    : await resolveSearchWithFallback(command, node, query);

                if (result) {
                    if (result.loadType === 'track') {
                        searchResults = [result.data];
                    } else if (result.loadType === 'playlist') {
                        const playlist = result.data as any;
                        searchResults = [{
                            info: {
                                title: `📁 ${playlist.info.name}`,
                                author: `Playlist (${playlist.tracks.length} tracks)`,
                                uri: query,
                                length: 0
                            },
                            isPlaylist: true
                        }];
                    } else if (result.loadType === 'search') {
                        searchResults = Array.isArray(result.data) ? result.data : [];
                    }

                    await CacheManager.setSearchResult(query, searchResults);
                }
            }
        }
    }

    // 3) Merge and de-duplicate
    const favoriteUrls = new Set(favorites.map(f => f.trackUrl));
    const finalResults: Array<{ name: string; value: string }> = [];

    for (const fav of filteredFavorites) {
        const title = fav.trackTitle.length > 40 ? `${fav.trackTitle.substring(0, 37)}...` : fav.trackTitle;
        const author = fav.author.length > 25 ? `${fav.author.substring(0, 22)}...` : fav.author;
        const duration = fav.trackDuration ? ` - ${fav.trackDuration}` : '';

        finalResults.push({
            name: `❤️ ${title} - ${author}${duration}`,
            value: fav.trackUrl
        });
    }

    for (const track of searchResults) {
        if (finalResults.length >= 25) break;
        if (favoriteUrls.has(track.info.uri)) continue;

        if ((track as any).isPlaylist) {
            finalResults.push({
                name: track.info.title,
                value: track.info.uri
            });
            continue;
        }

        const cleanedTitle = cleanTrackTitle(track.info.title, track.info.author);
        const title = cleanedTitle.length > 40 ? `${cleanedTitle.substring(0, 37)}...` : cleanedTitle;
        const author = track.info.author.length > 25 ? `${track.info.author.substring(0, 22)}...` : track.info.author;
        const duration = track.info.length > 0 ? ` - ${formatDuration(track.info.length)}` : '';

        finalResults.push({
            name: `🎵 ${title} - ${author}${duration}`,
            value: track.info.uri
        });
    }

    return finalResults.slice(0, 25);
}
