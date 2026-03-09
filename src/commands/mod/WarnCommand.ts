import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, checkThresholds } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout, getCancelledLayout, getTimeoutLayout } from '../../lib/layouts/modCommandLayouts';

export class WarnCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to warn').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const reason = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:memberNotFound')) });
        const err = await validateMod(interaction, target);
        if (err) return interaction.editReply({ ...getMessageLayout(err) });
        if (!await requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'warn', guildName: interaction.guild!.name, reason });
            await sendModLog({ guildId: interaction.guildId!, action: 'warn', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason });

            const warnCount = await prisma.modLog.count({ where: { guildId: interaction.guildId!, userId: target.id, action: 'warn' } });
            await checkThresholds({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild! });

            const content = await resolveKey(interaction, 'modcommands:mod.warn.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, count: warnCount });
            return interaction.editReply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD WARN]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:memberNotFound')) });
        const err = await validateMod(message, target);
        if (err) return message.reply({ ...getMessageLayout(err) });

        if (!await requireModConfig(message)) return;

        try {
            await sendModDM({ userId: target.id, action: 'warn', guildName: message.guild!.name, reason });
            await sendModLog({ guildId: message.guildId!, action: 'warn', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason });

            const warnCount = await prisma.modLog.count({ where: { guildId: message.guildId!, userId: target.id, action: 'warn' } });
            await checkThresholds({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild! });

            const content = await resolveKey(message, 'modcommands:mod.warn.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, count: warnCount });
            return message.reply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD WARN]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
