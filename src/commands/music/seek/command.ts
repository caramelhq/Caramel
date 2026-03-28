import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { parseTimestamp } from '../../../lib/utils/MusicUtils';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

@ApplyOptions<Command.Options>({
    name: 'seek',
    description: musicEn.command.seek.description,
    preconditions: ['GuildOnly']
})
export class SeekCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.seek.description })
                .addStringOption((option) =>
                    option
                        .setName('time')
                    .setDescription(musicEn.command.seek.options.time)
                    .setDescriptionLocalizations({ 'es-ES': musicEs.command.seek.options.time })
                        .setRequired(true)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const timeInput = interaction.options.getString('time', true);
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id), { requireCurrentTrack: true });
        if (!musicPlayer) return;
        const currentTrack = musicPlayer.current;
        if (!currentTrack) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        const ms = parseTimestamp(timeInput);
        if (ms === null) {
            const invalidTimeFormat = await resolveKey(interaction, 'music:errors.invalidTimeFormat');
            return interaction.reply({ ...getMessageLayout(`${Emojis.error_emoji} ${invalidTimeFormat}`), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        if (ms > (currentTrack.info.length ?? 0)) {
            const timeExceedsDuration = await resolveKey(interaction, 'music:errors.timeExceedsDuration');
            return interaction.reply({ ...getMessageLayout(`${Emojis.error_emoji} ${timeExceedsDuration}`), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        await musicPlayer.seek(ms);

        const seeked = await resolveKey(interaction, 'music:actions.seeked', { time: timeInput });
        return interaction.reply({
            ...getMessageLayout(`${Emojis.check_emoji} ${seeked}`)
        });
    }
}

