import { container } from '@sapphire/framework';
import sharp from 'sharp';


/**
 * Fetches the average dominant color from an image URL using sharp
 * @param url The image URL to process
 * @returns The hex color as a number (Discord format)
 */
export async function getDominantColor(url: string): Promise<number | null> {
    try {
        if (!url) return null;

        // Fetch image data ──────────
        const response = await fetch(url);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Use sharp to get image stats (average color per channel) ──────────
        const { channels } = await sharp(buffer).stats();
        
        // channels[0] = R, channels[1] = G, channels[2] = B
        const r = Math.round(channels[0].mean);
        const g = Math.round(channels[1].mean);
        const b = Math.round(channels[2].mean);

        return (r << 16) | (g << 8) | b;
    } catch (error) {
        container.logger.error(`[COLOR_EXTRACTOR] Failed to extract color from ${url}:`, error);
        return null;
    }
}
