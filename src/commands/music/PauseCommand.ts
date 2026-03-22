import { Command } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../lib/constants/emojis';

export class PauseCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'pause',
            aliases: ['resume'],
            description: 'Pause or resume the current track',
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName(this.name).setDescription(this.description)
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild, member } = interaction;
        const { music } = this.container;
        const musicPlayer = music.queues.get(guild!.id);

        if (!musicPlayer || !musicPlayer.current) {
            const noTrackMsg = await resolveKey(interaction, 'music:controls.noTrack');
            return interaction.reply({ ...getMessageLayout(noTrackMsg), ephemeral: true });
        }

        if (!(member instanceof GuildMember) || member.voice.channelId !== guild?.members.me?.voice.channelId) {
            const wrongChannelMsg = await resolveKey(interaction, 'music:play.wrongChannel');
            return interaction.reply({ ...getMessageLayout(wrongChannelMsg), ephemeral: true });
        }

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
