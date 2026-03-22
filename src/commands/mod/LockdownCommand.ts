import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message, TextChannel, NewsChannel } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig } from '../../lib/utils/ModUtils';
import { Emojis } from '../../lib/constants/emojis';
import { ContainerComponent, TextDisplayComponent } from '../../lib/layouts/ui';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'lockdown',
    description: 'Lock/Unlock a channel',
})
export class LockdownCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to lockdown (optional)'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;
        
        await interaction.deferReply({ ephemeral: false });

        if (!interaction.guild) throw new CaramelUserError('errors:unexpected');
        await requireModConfig(interaction.guildId!);

        if (!targetChannel || !('permissionOverwrites' in targetChannel)) {
             throw new CaramelUserError('errors:unexpected');
        }

        const textChannel = targetChannel as TextChannel | NewsChannel;
        const isLocked = textChannel.permissionOverwrites.cache.get(interaction.guildId!)?.deny.has(PermissionFlagsBits.SendMessages);
        const isRemote = targetChannel.id !== interaction.channelId;

        let content = '';
        let remoteContent = '';

        if (isLocked) {
            // Unlock
            await textChannel.permissionOverwrites.edit(interaction.guildId!, { SendMessages: null }, { reason: 'Manual Unlock' });
            
            if (isRemote) {
                content = `${Emojis.channel_unlocked_emoji} ${await resolveKey(interaction, 'modcommands:sanctions.confirmations.unlockdown_remote', { channel: targetChannel.toString() })}`;
                remoteContent = `${Emojis.channel_unlocked_emoji} ${await resolveKey(interaction, 'modcommands:sanctions.confirmations.unlockdown')}`;
            } else {
                content = `${Emojis.channel_unlocked_emoji} ${await resolveKey(interaction, 'modcommands:sanctions.confirmations.unlockdown')}`;
            }
        } else {
            // Lock
            await textChannel.permissionOverwrites.edit(interaction.guildId!, { SendMessages: false }, { reason: 'Manual Lockdown' });
            
            if (isRemote) {
                content = `${Emojis.channel_locked_emoji} ${await resolveKey(interaction, 'modcommands:sanctions.confirmations.lockdown_remote', { channel: targetChannel.toString() })}`;
                remoteContent = `${Emojis.channel_locked_emoji} ${await resolveKey(interaction, 'modcommands:sanctions.confirmations.lockdown')}`;
            } else {
                content = `${Emojis.channel_locked_emoji} ${await resolveKey(interaction, 'modcommands:sanctions.confirmations.lockdown')}`;
            }
        }

        if (isRemote && remoteContent) {
            await textChannel.send({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(remoteContent)])] }).catch(() => null);
        }

        return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(content)])] });
    }

    public async messageRun(message: Message, args: Args) {
        const targetChannel = await args.pick('guildTextChannel').catch(() => message.channel as TextChannel);

        if (!message.guild) throw new CaramelUserError('errors:unexpected');
        await requireModConfig(message.guildId!);

        const textChannel = targetChannel as TextChannel | NewsChannel;
        const isLocked = textChannel.permissionOverwrites.cache.get(message.guildId!)?.deny.has(PermissionFlagsBits.SendMessages);
        const isRemote = targetChannel.id !== message.channelId;

        let content = '';
        let remoteContent = '';

        if (isLocked) {
            // Unlock
            await textChannel.permissionOverwrites.edit(message.guildId!, { SendMessages: null }, { reason: 'Manual Unlock' });
            
            if (isRemote) {
                content = `${Emojis.channel_unlocked_emoji} ${await resolveKey(message, 'modcommands:sanctions.confirmations.unlockdown_remote', { channel: targetChannel.toString() })}`;
                remoteContent = `${Emojis.channel_unlocked_emoji} ${await resolveKey(message, 'modcommands:sanctions.confirmations.unlockdown')}`;
            } else {
                content = `${Emojis.channel_unlocked_emoji} ${await resolveKey(message, 'modcommands:sanctions.confirmations.unlockdown')}`;
            }
        } else {
            // Lock
            await textChannel.permissionOverwrites.edit(message.guildId!, { SendMessages: false }, { reason: 'Manual Lockdown' });
            
            if (isRemote) {
                content = `${Emojis.channel_locked_emoji} ${await resolveKey(message, 'modcommands:sanctions.confirmations.lockdown_remote', { channel: targetChannel.toString() })}`;
                remoteContent = `${Emojis.channel_locked_emoji} ${await resolveKey(message, 'modcommands:sanctions.confirmations.lockdown')}`;
            } else {
                content = `${Emojis.channel_locked_emoji} ${await resolveKey(message, 'modcommands:sanctions.confirmations.lockdown')}`;
            }
        }

        if (isRemote && remoteContent) {
            await textChannel.send({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(remoteContent)])] }).catch(() => null);
        }

        return message.reply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(content)])] });
    }
}
