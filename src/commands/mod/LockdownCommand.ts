import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, TextChannel, Message, ChannelType } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getLockdownLayout } from '../../lib/layouts/modCommandLayouts';
import { Emojis } from '../../lib/constants/emojis';

@ApplyOptions<Command.Options>({
    description: 'Lock or unlock a channel',
})
export class LockdownCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel (defaults to current)').addChannelTypes(ChannelType.GuildText))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
        await interaction.deferReply({ ephemeral: false });

        try {
            const everyoneOverwrite = target.permissionOverwrites.cache.get(interaction.guild!.roles.everyone.id);
            const isLocked = everyoneOverwrite?.deny.has(PermissionFlagsBits.SendMessages) ?? false;

            if (isLocked) {
                await target.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null });
                const content = await resolveKey(interaction, 'modcommands:mod.lockdown.unlocked', { emoji: Emojis.channel_unlocked_emoji, channel: target.id });
                await target.send(getLockdownLayout(await resolveKey(interaction, 'modcommands:mod.lockdown.unlockedMsg', { emoji: Emojis.channel_unlocked_emoji })));
                return interaction.editReply({ ...getMessageLayout(content) });
            } else {
                await target.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false });
                const content = await resolveKey(interaction, 'modcommands:mod.lockdown.locked', { emoji: Emojis.channel_locked_emoji, channel: target.id });
                await target.send(getLockdownLayout(await resolveKey(interaction, 'modcommands:mod.lockdown.lockedMsg', { emoji: Emojis.channel_locked_emoji })));
                return interaction.editReply({ ...getMessageLayout(content) });
            }
        } catch (error) {
            this.container.logger.error(`[MOD LOCKDOWN]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('channel').catch(() => message.channel) as TextChannel;

        try {
            const everyoneOverwrite = target.permissionOverwrites.cache.get(message.guild!.roles.everyone.id);
            const isLocked = everyoneOverwrite?.deny.has(PermissionFlagsBits.SendMessages) ?? false;

            if (isLocked) {
                await target.permissionOverwrites.edit(message.guild!.roles.everyone, { SendMessages: null });
                const content = await resolveKey(message, 'modcommands:mod.lockdown.unlocked', { emoji: Emojis.channel_unlocked_emoji, channel: target.id });
                await target.send(getLockdownLayout(await resolveKey(message, 'modcommands:mod.lockdown.unlockedMsg', { emoji: Emojis.channel_unlocked_emoji })));
                return message.reply({ ...getMessageLayout(content) });
            } else {
                await target.permissionOverwrites.edit(message.guild!.roles.everyone, { SendMessages: false });
                const content = await resolveKey(message, 'modcommands:mod.lockdown.locked', { emoji: Emojis.channel_locked_emoji, channel: target.id });
                await target.send(getLockdownLayout(await resolveKey(message, 'modcommands:mod.lockdown.lockedMsg', { emoji: Emojis.channel_locked_emoji })));
                return message.reply({ ...getMessageLayout(content) });
            }
        } catch (error) {
            this.container.logger.error(`[MOD LOCKDOWN]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
