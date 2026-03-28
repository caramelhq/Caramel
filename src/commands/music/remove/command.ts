import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

@ApplyOptions<Command.Options>({
    name: 'remove',
    description: musicEn.command.remove.description,
    preconditions: ['GuildOnly']
})
export class RemoveCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.remove.description })
                .addIntegerOption((option) =>
                    option
                        .setName('position')
                    .setDescription(musicEn.command.remove.options.position)
                    .setDescriptionLocalizations({ 'es-ES': musicEs.command.remove.options.position })
                        .setRequired(true)
                        .setMinValue(1)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const position = interaction.options.getInteger('position', true);
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id));
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        const removed = musicPlayer.removeTrack(position);
        if (!removed) {
            const invalidPosition = await resolveKey(interaction, 'music:errors.invalidPosition');
            return interaction.reply({ ...getMessageLayout(`${Emojis.error_emoji} ${invalidPosition}`), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        await musicPlayer.refresh().catch(() => null);

        const removedMsg = await resolveKey(interaction, 'music:actions.removed', { title: removed.info.title });
        return interaction.reply({
            ...getMessageLayout(`${Emojis.check_emoji} ${removedMsg}`)
        });
    }
}

