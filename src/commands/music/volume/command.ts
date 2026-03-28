import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

@ApplyOptions<Command.Options>({
    name: 'volume',
    description: musicEn.command.volume.description,
    preconditions: ['GuildOnly']
})
export class VolumeCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.volume.description })
                .addIntegerOption((option) =>
                    option
                        .setName('value')
                        .setDescription(musicEn.command.volume.options.value)
                        .setDescriptionLocalizations({ 'es-ES': musicEs.command.volume.options.value })
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(200)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const value = interaction.options.getInteger('value', true);
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id));
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        await musicPlayer.setVolume(value);

        const volumeSet = await resolveKey(interaction, 'music:actions.volumeSet', { value });
        return interaction.reply({
            ...getMessageLayout(`${Emojis.volume_emoji} ${volumeSet}`)
        });
    }
}

