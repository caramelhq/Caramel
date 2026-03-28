import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

@ApplyOptions<Command.Options>({
    name: 'loop',
    aliases: ['repeat'],
    description: musicEn.command.loop.description,
    preconditions: ['GuildOnly']
})
export class LoopCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.loop.description })
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id), { requireCurrentTrack: true });
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        musicPlayer.loop = !musicPlayer.loop;
        await musicPlayer.saveState().catch(() => null);
        await musicPlayer.refresh().catch(() => null);

        const successMsg = await resolveKey(interaction, musicPlayer.loop ? 'music:controls.loopEnabled' : 'music:controls.loopDisabled');
        
        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${successMsg}`) });
    }
}

