import { Emojis } from '../constants/emojis';
import { cleanTrackTitle, escapeMarkdown, parseEmoji, getProgressBar } from '../utils/MusicUtils';
import { ContainerComponent, TextDisplayComponent, SeparatorComponent, SectionComponent, ThumbnailComponent, ActionRowComponent, ButtonComponent } from './ui';

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

    const components: any[] = [
        SectionComponent(
            [TextDisplayComponent(`${Emojis.music_emoji} **${data.labels.nowPlaying}**\n${titleDisplay}\n\n**${data.labels.author}**: ${data.author}${inLine}${requestedByLine}`)],
            ThumbnailComponent(data.thumbnail)
        )
    ];

    if (data.showButtons === false) {
        components.push(SectionComponent(
            [TextDisplayComponent(progressBarString)],
            { type: 2, style: 2, custom_id: 'music_favorite', emoji: parseEmoji(data.isFavorited ? Emojis.unfavorite_song_emoji : Emojis.favorite_song_emoji) }
        ));
    } else {
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
        TextDisplayComponent(`${Emojis.queue_emoji} **${data.title}**`),
        TextDisplayComponent(`**${data.nowPlayingLabel}**: ${cleanTrackTitle(data.currentTrackTitle, data.currentTrackAuthor)}`),
        SeparatorComponent(1, true)
    ];

    let queueContent = data.tracks.length > 0 ? data.tracks.map(t => {
        const songName = cleanTrackTitle(t.title, t.author);
        const artistName = t.author.replace(/\s*-\s*Topic$/i, '').trim();
        return `\`${t.index}.\` [${escapeMarkdown(`${songName} - ${artistName}`)}](${t.url})`;
    }).join('\n') : '*The queue is empty.*';

    components.push(TextDisplayComponent(queueContent));

    if (data.totalPages > 1) {
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
        TextDisplayComponent(`${Emojis.music_emoji} **${data.title}**`),
        SeparatorComponent(1, true),
        TextDisplayComponent(data.lyrics),
        SeparatorComponent(1, false),
        TextDisplayComponent(`-# ${data.footer}`)
    ];

    if (data.totalPages > 1) {
        components.push(ActionRowComponent([
            ButtonComponent(`music_lyrics_prev_${data.currentPage}`, '', 2, parseEmoji(Emojis.prev_page_emoji), data.currentPage === 1),
            ButtonComponent('music_lyrics_page_display', `${data.currentPage}/${data.totalPages}`, 2, undefined, true),
            ButtonComponent(`music_lyrics_next_${data.currentPage}`, '', 2, parseEmoji(Emojis.next_page_emoji), data.currentPage === data.totalPages)
        ]));
    }

    return { flags: 32768, components: [ContainerComponent(components, data.accentColor)] };
}
