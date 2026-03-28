import { Command } from '@sapphire/framework';
import { resolveKey } from '@sapphire/plugin-i18next';
import { GuildMember } from 'discord.js';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { MusicPlayer } from '../../../lib/structures/MusicPlayer';

type EnsureMusicPlayerOptions = {
    requireCurrentTrack?: boolean;
    missingPlayerKey?: string;
};

export async function ensureMusicPlayer(
    interaction: Command.ChatInputCommandInteraction,
    musicPlayer: MusicPlayer | undefined,
    options: EnsureMusicPlayerOptions = {}
): Promise<MusicPlayer | null> {
    const { requireCurrentTrack = false, missingPlayerKey = 'music:controls.noTrack' } = options;

    if (!musicPlayer || (requireCurrentTrack && !musicPlayer.current)) {
        const message = await resolveKey(interaction, missingPlayerKey);
        await interaction.reply({ ...getMessageLayout(message), flags: ['Ephemeral', 'IsComponentsV2'] });
        return null;
    }

    return musicPlayer;
}

export async function ensureSameVoiceChannel(interaction: Command.ChatInputCommandInteraction): Promise<boolean> {
    const { guild, member } = interaction;

    if (!(member instanceof GuildMember) || member.voice.channelId !== guild?.members.me?.voice.channelId) {
        const message = await resolveKey(interaction, 'music:play.wrongChannel');
        await interaction.reply({ ...getMessageLayout(message), flags: ['Ephemeral', 'IsComponentsV2'] });
        return false;
    }

    return true;
}

export async function ensureUserInVoiceChannel(interaction: Command.ChatInputCommandInteraction): Promise<boolean> {
    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channelId) {
        const message = await resolveKey(interaction, 'music:play.noChannel');
        await interaction.reply({ ...getMessageLayout(message), flags: ['Ephemeral', 'IsComponentsV2'] });
        return false;
    }

    return true;
}
