import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';

export class QueueCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'queue',
            aliases: ['q'],
            description: 'Show the current music queue',
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

        if (!musicPlayer || (musicPlayer.queue.length === 0 && !musicPlayer.current)) {
            const emptyMsg = await resolveKey(interaction, 'music:queue.empty');
            return interaction.reply({ ...getMessageLayout(emptyMsg), ephemeral: true });
        }

        const layout = await musicPlayer.buildQueueLayout(guild!, 1);
        if (!layout) {
            return interaction.reply({ ...getMessageLayout('`❌` Failed to build layout.'), ephemeral: true });
        }

        const msg = await interaction.reply({ 
            ...(layout as any), 
            fetchReply: true 
        });

        setTimeout(() => {
            msg.delete().catch(() => null);
        }, 30000);

        return;
    }
}
