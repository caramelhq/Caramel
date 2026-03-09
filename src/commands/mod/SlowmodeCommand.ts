import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, ChannelType, TextChannel, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout } from '../../lib/layouts/modCommandLayouts';

export class SlowmodeCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel (defaults to current)').addChannelTypes(ChannelType.GuildText))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const seconds = interaction.options.getInteger('seconds', true);
        const target  = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
        await interaction.deferReply({ ephemeral: false });

        try {
            await target.setRateLimitPerUser(seconds);
            const content = seconds === 0
                ? await resolveKey(interaction, 'modcommands:mod.slowmode.disabled', { emoji: Emojis.timeout_emoji, channel: target.id })
                : await resolveKey(interaction, 'modcommands:mod.slowmode.success', { emoji: Emojis.timeout_emoji, seconds, channel: target.id });
            return interaction.editReply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD SLOWMODE]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const seconds = await args.pick('integer').catch(() => null);
        if (seconds === null || seconds < 0 || seconds > 21600) return message.reply({ ...getMessageLayout('`❌` Usage: `c!slowmode <seconds> [#channel]`') });

        const target = await args.pick('channel').catch(() => message.channel) as TextChannel;

        try {
            await target.setRateLimitPerUser(seconds);
            const content = seconds === 0
                ? await resolveKey(message, 'modcommands:mod.slowmode.disabled', { emoji: Emojis.timeout_emoji, channel: target.id })
                : await resolveKey(message, 'modcommands:mod.slowmode.success', { emoji: Emojis.timeout_emoji, seconds, channel: target.id });
            return message.reply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD SLOWMODE]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
