import { Command } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../lib/constants/emojis';

export class StopCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'stop',
            aliases: ['leave', 'dc', 'disconnect'],
            description: 'Stop the music and clear the queue',
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

        if (!musicPlayer) {
            return interaction.reply({ ...getMessageLayout('`❌` No active player found.'), ephemeral: true });
        }

        if (!(member instanceof GuildMember) || member.voice.channelId !== guild?.members.me?.voice.channelId) {
            const wrongChannelMsg = await resolveKey(interaction, 'music:play.wrongChannel');
            return interaction.reply({ ...getMessageLayout(wrongChannelMsg), ephemeral: true });
        }

        musicPlayer.queue = [];
        musicPlayer.loop = false;
        await musicPlayer.player.stopTrack();
        
        await music.leaveVoiceChannel(guild!.id);
        music.queues.delete(guild!.id);

        const stopMsg = await resolveKey(interaction, 'music:controls.stop');
        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${stopMsg}`) });
    }
}
