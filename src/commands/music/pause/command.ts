import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

export class PauseCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'pause',
            aliases: ['resume'],
            description: musicEn.command.pause.description,
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.pause.description })
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id), { requireCurrentTrack: true });
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        const isPaused = musicPlayer.player.paused;
        await musicPlayer.player.setPaused(!isPaused);

        const msgKey = isPaused ? 'music:controls.resumed' : 'music:controls.paused';
        const msg = await resolveKey(interaction, msgKey);

        // Update the main player layout if it exists
        const layout = await musicPlayer.buildLayout(guild!);
        if (layout) {
            // We can't easily find the message to update it from here without storing the message ID,
            // but the next interaction or track start will refresh it.
            // For now, just reply to the command.
        }

        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${msg}`) });
    }
}

