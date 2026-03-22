import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getLyricsLayout } from '../../lib/layouts/musicLayouts';
import { cleanTrackTitle } from '../../lib/utils/MusicUtils';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { ComponentType } from 'discord.js';


// Constants ──────────────────

const LRCLIB_API = 'https://lrclib.net/api/search';


// Lyrics command ──────────────────

@ApplyOptions<Command.Options>({
    name: 'lyrics',
    aliases: ['ly'],
    description: 'Get lyrics for the current song or a specific one',
    preconditions: ['GuildOnly']
})
export class LyricsCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName('query')
                        .setDescription('The song to search for (Artist - Title)')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const queryOption = interaction.options.getString('query');
        const { music } = this.container;
        const musicPlayer = music.queues.get(interaction.guildId!);

        let searchTitle = queryOption;

        if (!searchTitle) {
            if (!musicPlayer || !musicPlayer.current) {
                const errorMsg = await resolveKey(interaction, 'music:controls.noTrack');
                return interaction.reply({ ...getMessageLayout(errorMsg), ephemeral: true });
            }
            const info = musicPlayer.current.info;
            const author = info.author.replace(/ - Topic$/i, ''); 
            const cleanedTitle = cleanTrackTitle(info.title, author);

            searchTitle = `${author} - ${cleanedTitle}`;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await fetch(`${LRCLIB_API}?q=${encodeURIComponent(searchTitle)}`);
            const data = await response.json() as any[];

            if (!data || data.length === 0 || (!data[0].plainLyrics && !data[0].syncedLyrics)) {
                const noResults = await resolveKey(interaction, 'music:lyrics.noResults');
                return interaction.editReply({ ...getMessageLayout(noResults) });
            }

            // Find the best match (prioritize synced lyrics for better quality)
            const bestMatch = data.find(m => m.syncedLyrics) || data[0];
            const lyricsText = bestMatch.plainLyrics || bestMatch.syncedLyrics.replace(/\[\d+:\d+.\d+\]/g, '');
            const pages = this.paginateLyrics(lyricsText);
            let currentPage = 1;

            const updatePage = async (page: number) => {
                const footer = await resolveKey(interaction, 'music:lyrics.footer', { current: page, total: pages.length });
                return getLyricsLayout({
                    title: bestMatch.trackName, // Use official track name from API
                    lyrics: pages[page - 1],
                    currentPage: page,
                    totalPages: pages.length,
                    footer
                });
            };

            const responseMsg = await interaction.editReply(await updatePage(currentPage));

            // Collector for pagination ──────────
            const collector = responseMsg.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId.includes('prev')) currentPage--;
                    else if (i.customId.includes('next')) currentPage++;

                    await i.update(await updatePage(currentPage));
                } catch (err) {
                    if ((err as any).code !== 10062) {
                        this.container.logger.error('[LYRICS_COLLECTOR] Error:', err);
                    }
                }
            });

            collector.on('end', async () => {
                try {
                    const finalLayout = await updatePage(currentPage);
                    const disabledComponents = finalLayout.components.map((c: any) => {
                        if (c.type === 1) { // ActionRow
                            return {
                                ...c,
                                components: c.components.map((b: any) => ({ ...b, disabled: true }))
                            };
                        }
                        return c;
                    });

                    await interaction.editReply({ components: disabledComponents });
                } catch {
                    // Ignore if interaction is already gone
                }
            });

        } catch (error) {
            this.container.logger.error('[LYRICS] API error:', error);
            const errorMsg = await resolveKey(interaction, 'music:lyrics.noResults');
            return interaction.editReply({ ...getMessageLayout(errorMsg) });
        }
    }

    private paginateLyrics(text: string): string[] {
        const lines = text.split('\n');
        const pages: string[] = [];
        let currentChunk = '';

        for (const line of lines) {
            // Smaller chunks for better readability in Components V2
            if ((currentChunk + line).length > 800) {
                pages.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += line + '\n';
        }

        if (currentChunk.trim()) {
            pages.push(currentChunk.trim());
        }

        return pages;
    }
}
