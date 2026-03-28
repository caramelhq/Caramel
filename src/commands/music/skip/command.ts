import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

@ApplyOptions<Command.Options>({
    name: 'skip',
    aliases: ['next', 's'],
    description: musicEn.command.skip.description,
    preconditions: ['GuildOnly']
})
export class SkipCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.skip.description })
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id), { requireCurrentTrack: true });
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        // Loop is Law: If loop is enabled, skip just restarts the track
        if (musicPlayer.loop) {
            await musicPlayer.player.playTrack({ track: { encoded: (musicPlayer.current as any).encoded } });
            // We can still send the skip message, but the result will be a restart
        } else {
            await musicPlayer.player.stopTrack();
        }

        const successMsg = await resolveKey(interaction, 'music:controls.skip');
        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${successMsg}`) });
    }
}

