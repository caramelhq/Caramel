import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { Emojis } from '../../lib/constants/emojis';
import { GuildMember } from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'shuffle',
    description: 'Shuffle the current music queue',
    preconditions: ['GuildOnly']
})
export class ShuffleCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder.setName(this.name).setDescription(this.description)
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild, member } = interaction;
        const { music } = this.container;
        const musicPlayer = music.queues.get(guild!.id);

        if (!musicPlayer || !musicPlayer.current) {
            const errorMsg = await resolveKey(interaction, 'music:controls.noTrack');
            return interaction.reply({ ...getMessageLayout(errorMsg), ephemeral: true });
        }

        if (!(member instanceof GuildMember) || member.voice.channelId !== guild?.members.me?.voice.channelId) {
            const errorMsg = await resolveKey(interaction, 'music:play.wrongChannel');
            return interaction.reply({ ...getMessageLayout(errorMsg), ephemeral: true });
        }

        if (musicPlayer.queue.length < 2) {
            return interaction.reply({ ...getMessageLayout('`❌` Not enough tracks in queue to shuffle.'), ephemeral: true });
        }

        musicPlayer.shuffle();

        const successMsg = await resolveKey(interaction, 'music:controls.shuffle');
        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${successMsg}`) });
    }
}
