import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { FilterType } from '../../../lib/constants/musicFilters';
import { ContainerComponent, SectionComponent, TextDisplayComponent } from '../../../lib/layouts/ui';
import { ensureMusicPlayer, ensureUserInVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

export class FilterCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'filter',
            description: musicEn.command.filter.description,
            preconditions: ['GuildOnly']
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.filter.description })
                .addStringOption((option) =>
                    option
                        .setName('type')
                        .setDescription(musicEn.command.filter.options.type)
                        .setDescriptionLocalizations({ 'es-ES': musicEs.command.filter.options.type })
                        .setRequired(true)
                        .addChoices(
                            { name: 'None (Off)', value: 'off' },
                            { name: 'Bassboost', value: 'bassboost' },
                            { name: 'Nightcore', value: 'nightcore' },
                            { name: 'Vaporwave', value: 'vaporwave' },
                            { name: 'Pop', value: 'pop' },
                            { name: 'Soft', value: 'soft' }
                        )
                )
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild, options } = interaction;
        const filter = options.getString('type', true) as FilterType;
        const { music } = this.container;

        const isInVoiceChannel = await ensureUserInVoiceChannel(interaction);
        if (!isInVoiceChannel) return;

        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id));
        if (!musicPlayer) return;

        await interaction.deferReply();

        try {
            await musicPlayer.setFilter(filter);
            
            const msgKey = filter === 'off' ? 'music:filters.disabled' : `music:filters.applied`;
            const msg = await resolveKey(interaction, msgKey, { filter: filter.charAt(0).toUpperCase() + filter.slice(1) });

            // UI Response
            return interaction.editReply({
                components: [
                    ContainerComponent([
                        SectionComponent([
                            TextDisplayComponent(`${msg}`)
                        ])
                    ])
                ]
            } as any);
        } catch (error) {
            this.container.logger.error(`[FILTER_COMMAND] Error:`, error);
            const errorMsg = await resolveKey(interaction, 'music:errors.filterApplyFailed');
            return interaction.editReply(errorMsg);
        }
    }
}

