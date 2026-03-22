import { Emojis } from '../constants/emojis';

/**
 * Formats milliseconds to MM:SS or HH:MM:SS
 * @param ms Milliseconds
 * @returns Formatted string
 */
export function formatDuration(ms: number): string {
    if (ms <= 0) return '0:00';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    
    if (hours > 0) {
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }

    return `${minutes}:${formattedSeconds}`;
}

/**
 * Cleans YouTube track titles by removing common suffixes and artist names
 */
export function cleanTrackTitle(title: string, author?: string): string {
    let cleaned = title.trim();

    // 1. Remove common YouTube suffixes in parentheses or brackets (aggressive)
    const garbageRegex = /[\(\[][^)\]]*(lyrics|video|official|audio|4k|hd|hq|edit|prod|feat|ft|videoletra|video oficial|letra|cover|visualizer|360°|360|video lyric|clip|full album|album|topic|sub|español|hangul|romanizado|eng|esp|han|kan|rom|trans|lyrics|mv|pv|live|performance|remastered|remix|extended|original)[^)\]]*[\)\]]/gi;
    cleaned = cleaned.replace(garbageRegex, '').trim();

    // 2. Remove common text patterns not in brackets
    const textGarbageRegex = /(official video|official audio|lyric video|video oficial|audio oficial|videoletra|video con letra|visualizer|audio lyric|360° visualizer|sub español|sub english|hangul lyrics|romanized lyrics|english lyrics|mv|pv|music video|full hd|remastered|remix)/gi;
    cleaned = cleaned.replace(textGarbageRegex, '').trim();

    // 3. Handle Pipe/Bullet/Dash Delimiters (split and take first)
    const delimiters = [' | ', ' • ', ' - ', ' ÔÇô ']; // Added common encoding artifacts
    for (const del of delimiters) {
        if (cleaned.includes(del)) {
            const parts = cleaned.split(del);
            // If the part before the delimiter is short (likely artist), take the part after
            if (parts[0].trim().length < 5 || (author && parts[0].toLowerCase().includes(author.toLowerCase().replace(/\s*-\s*Topic$/i, '').trim()))) {
                cleaned = parts[1].trim();
            } else {
                cleaned = parts[0].trim();
            }
            break; 
        }
    }

    // 4. Surgical removal of Author if it's at the start
    if (author) {
        const cleanAuthor = author.replace(/\s*-\s*Topic$/i, '').trim();
        const escapedAuthor = cleanAuthor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const authorRegex = new RegExp(`^${escapedAuthor}\\s*[-–—:| ]+\\s*`, 'i');
        cleaned = cleaned.replace(authorRegex, '').trim();
    }

    // 5. Final cleanup of trailing/leading special characters and extra spaces
    cleaned = cleaned.replace(/^[\[\(\{\s\-\|:·–—•]+|[\]\)\}\s\-\|:·–—•]+$/g, '');
    
    // 6. Remove remaining double spaces
    const final = cleaned.replace(/\s+/g, ' ').trim();
    
    // 7. If cleaning resulted in almost nothing, return original but trimmed
    return final.length > 2 ? final : title.trim();
}

/**
 * Escapes brackets for Discord Markdown links
 */
export function escapeMarkdown(text: string): string {
    return text.replace(/[\[\]]/g, '\\$&');
}

/**
 * Helper to parse emoji strings to Discord API format
 */
export function parseEmoji(emojiStr: string) {
    if (!emojiStr) return undefined;
    const match = emojiStr.match(/<(a?):(\w+):(\d+)>/);
    if (match) {
        return { 
            name: match[2], 
            id: match[3], 
            animated: match[1] === 'a' 
        };
    }
    return { name: emojiStr };
}

/**
 * Generates a textual progress bar
 */
export function getProgressBar(position: number, duration: number, length: number = 8): string {
    const progress = Math.min(Math.max(position / duration, 0), 1);
    const filledLength = Math.round(length * progress);
    
    const bar = Emojis.progress_bar_emoji.repeat(filledLength) + Emojis.progress_dot_emoji + Emojis.progress_bar_emoji.repeat(Math.max(0, length - filledLength));
    return `\`${formatDuration(position)}\` ${bar} \`${formatDuration(duration)}\``;
}
