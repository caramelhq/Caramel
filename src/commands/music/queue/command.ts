import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { MusicUiTtlMs } from '../../../lib/constants/musicUi';
import { scheduleEphemeralReplyDeletion } from '../../../command-helpers/music/shared/ephemeral';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

export class QueueCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'queue',
            aliases: ['q'],
            description: musicEn.command.queue.description,
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.queue.description })
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = music.queues.get(guild!.id);

        if (!musicPlayer || (musicPlayer.queue.length === 0 && !musicPlayer.current)) {
            const emptyMsg = await resolveKey(interaction, 'music:queue.empty');
            return interaction.reply({ ...getMessageLayout(emptyMsg), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        const layout = await musicPlayer.buildQueueLayout(guild!, 1);
        if (!layout) {
            const failedLayout = await resolveKey(interaction, 'music:errors.failedBuildLayout');
            return interaction.reply({ ...getMessageLayout(failedLayout), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        await interaction.reply({ 
            ...(layout as any), 
            fetchReply: true,
            flags: ['Ephemeral', 'IsComponentsV2']
        });

        scheduleEphemeralReplyDeletion(interaction, MusicUiTtlMs.queueEphemeral);

        return;
    }
}

