import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getLyricsLayout } from '../../../lib/layouts/musicLayouts';
import { cleanTrackTitle } from '../../../lib/utils/MusicUtils';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { ComponentType } from 'discord.js';
import { searchLyricsPages } from '../../../command-helpers/music/lyrics/core/service';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';


// Lyrics command ──────────────────

@ApplyOptions<Command.Options>({
    name: 'lyrics',
    aliases: ['ly'],
    description: musicEn.command.lyrics.description,
    preconditions: ['GuildOnly']
})
export class LyricsCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.lyrics.description })
                .addStringOption((option) =>
                    option
                        .setName('query')
                    .setDescription(musicEn.command.lyrics.options.query)
                    .setDescriptionLocalizations({ 'es-ES': musicEs.command.lyrics.options.query })
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
                return interaction.reply({ ...getMessageLayout(errorMsg), flags: ['Ephemeral', 'IsComponentsV2'] });
            }
            const info = musicPlayer.current.info;
            const author = info.author.replace(/ - Topic$/i, ''); 
            const cleanedTitle = cleanTrackTitle(info.title, author);

            searchTitle = `${author} - ${cleanedTitle}`;
        }

        await interaction.deferReply({ flags: ['Ephemeral'] });

        try {
            const lyricsResult = await searchLyricsPages(searchTitle);
            if (!lyricsResult) {
                const noResults = await resolveKey(interaction, 'music:lyrics.noResults');
                return interaction.editReply({ ...getMessageLayout(noResults) });
            }

            let currentPage = 1;

            const updatePage = async (page: number) => {
                const footer = await resolveKey(interaction, 'music:lyrics.footer', { current: page, total: lyricsResult.pages.length });
                return getLyricsLayout({
                    title: lyricsResult.title,
                    lyrics: lyricsResult.pages[page - 1],
                    currentPage: page,
                    totalPages: lyricsResult.pages.length,
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
}

