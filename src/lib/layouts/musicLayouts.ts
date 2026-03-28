import { Emojis } from '../constants/emojis';
import { cleanTrackTitle, escapeMarkdown, parseEmoji, getProgressBar } from '../utils/MusicUtils';
import { ContainerComponent, TextDisplayComponent, SeparatorComponent, SectionComponent, ThumbnailComponent, ActionRowComponent, ButtonComponent, StringSelectComponent } from './ui';

export function getSearchLayout(data: {
    query: string;
    tracks: { title: string; author: string; album?: string; identifier: string; uri: string; artworkUrl?: string }[];
    labels: {
        title: string;
        placeholder: string;
        author: string;
        album: string;
    }
}) {
    const components: any[] = [
        TextDisplayComponent(`## ${Emojis.search_emoji} ${data.labels.title}: \`${data.query}\``)
    ];

    for (const track of data.tracks.slice(0, 5)) {
        const cleanedTitle = cleanTrackTitle(track.title, track.author);
        const songUrl = track.uri;
        const albumName = track.album || '—';
        
        const rawThumbnail = track.artworkUrl ?? `https://img.youtube.com/vi/${track.identifier}/hqdefault.jpg`;
        const thumbnail = `https://images.weserv.nl/?url=${encodeURIComponent(rawThumbnail)}&w=512&h=512&fit=cover&a=center`;

        components.push(SeparatorComponent(1, true));
        components.push(SectionComponent(
            [TextDisplayComponent(`[${escapeMarkdown(cleanedTitle)}](${songUrl})\n\n**${data.labels.author}:** ${track.author}\n**${data.labels.album}:** ${albumName}`)],
            ThumbnailComponent(thumbnail)
        ));
    }

    const options = data.tracks.slice(0, 5).map((t, i) => ({
        label: cleanTrackTitle(t.title, t.author).substring(0, 100),
        value: `search_select_${t.identifier}`,
        description: t.author.substring(0, 100),
        emoji: parseEmoji(Emojis.music_emoji)
    }));

    components.push(SeparatorComponent(1, true));
    components.push(ActionRowComponent([
        StringSelectComponent('music_search_selector', options, data.labels.placeholder)
    ]));

    return { flags: 32768, components: [ContainerComponent(components)] };
}

export function getMusicPlayerLayout(data: {
    title: string;
    url: string;
    thumbnail: string;
    author: string;
    requestedBy: string;
    isPaused: boolean;
    isLooping: boolean;
    isFavorited?: boolean;
    position: number;
    duration: number;
    isAutoplay: boolean;
    voiceChannelId?: string;
    showButtons?: boolean;
    accentColor?: number;
    labels: {
        nowPlaying: string;
        requestedBy: string;
        author: string;
        pause: string;
        resume: string;
        skip: string;
        stop: string;
        loop: string;
        queue: string;
        in: string;
        autoplay: string;
    }
}) {
    const cleanedTitle = cleanTrackTitle(data.title, data.author);
    const escapedTitle = escapeMarkdown(cleanedTitle);

    let titleDisplay = `[${escapedTitle}](${data.url})`;
    const hasWideChars = /[^\u0000-\u024F]/.test(cleanedTitle);
    const threshold = hasWideChars ? 30 : 40;

    if (cleanedTitle.length > threshold) {
        const splitPos = hasWideChars ? 28 : 35;
        const maxChars = hasWideChars ? 56 : 70;
        const part1 = escapeMarkdown(cleanedTitle.substring(0, splitPos));
        const part2 = escapeMarkdown(cleanedTitle.substring(splitPos, maxChars) + (cleanedTitle.length > maxChars ? '...' : ''));
        titleDisplay = `[${part1}](${data.url})\n[${part2}](${data.url})`;
    }

    let progressBarString = getProgressBar(data.position, data.duration);
    if (data.showButtons === false) progressBarString += '\u2800\u2800';

    const requestedByLine = data.showButtons !== false ? `\n-# ${data.labels.requestedBy}: <@${data.requestedBy}>` : '';
    const inLine = data.showButtons === false && data.voiceChannelId ? `\n**${data.labels.in}**: <#${data.voiceChannelId}>` : '';
    const mainEmoji = data.isAutoplay ? Emojis.autoplay_emoji : Emojis.music_emoji;

    const components: any[] = [
        SectionComponent(
            [TextDisplayComponent(`${mainEmoji} **${data.labels.nowPlaying}**\n${titleDisplay}\n\n**${data.labels.author}**: ${data.author}${inLine}${requestedByLine}`)],
            ThumbnailComponent(data.thumbnail)
        )
    ];

    if (data.showButtons === false) {
        // NowPlaying Mode: Show Progress Bar + Favorite Button
        components.push(SectionComponent(
            [TextDisplayComponent(progressBarString)],
            ButtonComponent('music_favorite', '', 2, parseEmoji(data.isFavorited ? Emojis.unfavorite_song_emoji : Emojis.favorite_song_emoji))
        ));
    } else {
        // Control Mode: Show Action Row with 5 main buttons
        components.push(SeparatorComponent(1, true));
        components.push(ActionRowComponent([
            ButtonComponent('music_pause', '', data.isPaused ? 2 : 2, parseEmoji(data.isPaused ? Emojis.play_emoji : Emojis.pause_emoji)),
            ButtonComponent('music_skip', '', 2, parseEmoji(Emojis.skip_emoji)),
            ButtonComponent('music_loop', '', data.isLooping ? 1 : 2, parseEmoji(data.isLooping ? Emojis.loop_on_emoji : Emojis.loop_emoji)),
            ButtonComponent('music_queue', '', 2, parseEmoji(Emojis.queue_emoji)),
            ButtonComponent('music_stop', '', 2, parseEmoji(Emojis.stop_emoji))
        ]));
    }

    return { flags: 32768, components: [ContainerComponent(components, data.accentColor)] };
}

export function getQueueLayout(data: {
    title: string;
    nowPlayingLabel: string;
    currentTrackTitle: string;
    currentTrackAuthor: string;
    tracks: { index: number; title: string; url: string; author: string }[];
    currentPage: number;
    totalPages: number;
    totalTracks: number;
}) {
    const components: any[] = [
        TextDisplayComponent(`## ${Emojis.queue_emoji} ${data.title}\n**${data.nowPlayingLabel}**: ${cleanTrackTitle(data.currentTrackTitle, data.currentTrackAuthor)}`),
        SeparatorComponent(1, true)
    ];

    let queueContent = data.tracks.length > 0 ? data.tracks.map(t => {
        const songName = cleanTrackTitle(t.title, t.author);
        const artistName = t.author.replace(/\s*-\s*Topic$/i, '').trim();
        return `\`${t.index}.\` [${escapeMarkdown(`${songName} - ${artistName}`)}](${t.url})`;
    }).join('\n') : '*The queue is empty.*';

    components.push(TextDisplayComponent(queueContent));

    if (data.totalPages > 1) {
        components.push(SeparatorComponent(1, false));
        components.push(ActionRowComponent([
            ButtonComponent(`music_queue_prev_${data.currentPage}`, '', 2, parseEmoji(Emojis.prev_page_emoji), data.currentPage === 1),
            ButtonComponent('music_queue_page_display', `${data.currentPage}/${data.totalPages}`, 2, undefined, true),
            ButtonComponent(`music_queue_next_${data.currentPage}`, '', 2, parseEmoji(Emojis.next_page_emoji), data.currentPage === data.totalPages)
        ]));
    }

    return { flags: 32768, components: [ContainerComponent(components)] };
}

export function getLyricsLayout(data: {
    title: string;
    lyrics: string;
    currentPage: number;
    totalPages: number;
    footer: string;
    accentColor?: number;
}) {
    const components: any[] = [
        TextDisplayComponent(`## ${Emojis.music_emoji} ${data.title}`),
        SeparatorComponent(1, true),
        TextDisplayComponent(data.lyrics),
        SeparatorComponent(1, false),
        TextDisplayComponent(`-# ${data.footer}`)
    ];

    if (data.totalPages > 1) {
        components.push(SeparatorComponent(1, false));
        components.push(ActionRowComponent([
            ButtonComponent(`music_lyrics_prev_${data.currentPage}`, '', 2, parseEmoji(Emojis.prev_page_emoji), data.currentPage === 1),
            ButtonComponent('music_lyrics_page_display', `${data.currentPage}/${data.totalPages}`, 2, undefined, true),
            ButtonComponent(`music_lyrics_next_${data.currentPage}`, '', 2, parseEmoji(Emojis.next_page_emoji), data.currentPage === data.totalPages)
        ]));
    }

    return { flags: 32768, components: [ContainerComponent(components, data.accentColor)] };
}
