import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { MusicUiTtlMs } from '../../../lib/constants/musicUi';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

export class NowPlayingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'nowplaying',
            aliases: ['np'],
            description: musicEn.command.nowPlaying.description,
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.nowPlaying.description })
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = music.queues.get(guild!.id);

        if (!musicPlayer || !musicPlayer.current) {
            const noTrackMsg = await resolveKey(interaction, 'music:controls.noTrack');
            return interaction.reply({ ...getMessageLayout(noTrackMsg), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        const layout = await musicPlayer.buildNowPlayingLayout(guild!, interaction.user.id);
        if (!layout) {
            const failedLayout = await resolveKey(interaction, 'music:errors.failedBuildLayout');
            return interaction.reply({ ...getMessageLayout(failedLayout), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        // Send the layout as ephemeral and auto-delete after TTL.
        await interaction.reply({ 
            ...(layout as any), 
            fetchReply: true,
            flags: ['Ephemeral', 'IsComponentsV2']
        });

        setTimeout(() => {
            interaction.deleteReply().catch(() => null);
        }, MusicUiTtlMs.nowPlayingEphemeral);

        return;
    }
}
