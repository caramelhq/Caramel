import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';

export class NowPlayingCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'nowplaying',
            aliases: ['np'],
            description: 'Show the currently playing track with controls',
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName(this.name).setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = music.queues.get(guild!.id);

        if (!musicPlayer || !musicPlayer.current) {
            const noTrackMsg = await resolveKey(interaction, 'music:controls.noTrack');
            return interaction.reply({ ...getMessageLayout(noTrackMsg), ephemeral: true });
        }

        const layout = await musicPlayer.buildLayout(guild!, interaction.user.id, false);
        if (!layout) {
            return interaction.reply({ ...getMessageLayout('`❌` Failed to build layout.'), ephemeral: true });
        }

        // Send the layout without buttons (publicly)
        const msg = await interaction.reply({ 
            ...(layout as any), 
            fetchReply: true 
        });

        setTimeout(() => {
            msg.delete().catch(() => null);
        }, 15000);

        return;
    }
}
