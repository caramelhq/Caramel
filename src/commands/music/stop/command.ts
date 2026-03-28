import { Command } from '@sapphire/framework';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../../lib/constants/emojis';
import { ensureMusicPlayer, ensureSameVoiceChannel } from '../../../command-helpers/music/shared/guards';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';

export class StopCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'stop',
            aliases: ['leave', 'dc', 'disconnect'],
            description: musicEn.command.stop.description,
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.stop.description })
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild } = interaction;
        const { music } = this.container;
        const musicPlayer = await ensureMusicPlayer(interaction, music.queues.get(guild!.id), { missingPlayerKey: 'music:errors.noActivePlayer' });
        if (!musicPlayer) return;

        const inSameVoiceChannel = await ensureSameVoiceChannel(interaction);
        if (!inSameVoiceChannel) return;

        musicPlayer.queue = [];
        musicPlayer.loop = false;
        await musicPlayer.player.stopTrack();
        musicPlayer.dispose();
        
        await music.leaveVoiceChannel(guild!.id);
        music.queues.delete(guild!.id);

        const stopMsg = await resolveKey(interaction, 'music:controls.stop');
        return interaction.reply({ ...getMessageLayout(`${Emojis.check_emoji} ${stopMsg}`) });
    }
}

