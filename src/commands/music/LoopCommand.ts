import { Command } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../lib/constants/emojis';

export class LoopCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'loop',
            aliases: ['repeat'],
            description: 'Toggle loop mode for the current track',
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

        musicPlayer.loop = !musicPlayer.loop;

        const loopState = await resolveKey(interaction, musicPlayer.loop ? 'music:controls.on' : 'music:controls.off');
        const loopMsg = await resolveKey(interaction, 'music:controls.loop', { state: loopState });

        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${loopMsg}`) });
    }
}
