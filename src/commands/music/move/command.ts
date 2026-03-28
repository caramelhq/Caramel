import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

@ApplyOptions<Command.Options>({
    name: 'move',
    description: musicEn.command.move.description,
    preconditions: ['GuildOnly']
})
export class MoveCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.move.description })
                .addIntegerOption((option) =>
                    option
                        .setName('from')
                        .setDescription(musicEn.command.move.options.from)
                        .setDescriptionLocalizations({ 'es-ES': musicEs.command.move.options.from })
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addIntegerOption((option) =>
                    option
                        .setName('to')
                        .setDescription(musicEn.command.move.options.to)
                        .setDescriptionLocalizations({ 'es-ES': musicEs.command.move.options.to })
                        .setRequired(true)
                        .setMinValue(1)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const from = interaction.options.getInteger('from', true);
        const to = interaction.options.getInteger('to', true);
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id));
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        const success = musicPlayer.moveTrack(from, to);
        if (!success) {
            const invalidPositions = await resolveKey(interaction, 'music:errors.invalidPositions');
            return interaction.reply({ ...getMessageLayout(`${Emojis.error_emoji} ${invalidPositions}`), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        await musicPlayer.refresh().catch(() => null);

        const moved = await resolveKey(interaction, 'music:actions.moved', { from, to });
        return interaction.reply({
            ...getMessageLayout(`${Emojis.check_emoji} ${moved}`)
        });
    }
}

