import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout, getCancelledLayout, getTimeoutLayout } from '../../lib/layouts/modCommandLayouts';

export class SoftbanCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to softban').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7, default 3)').setMinValue(0).setMaxValue(7))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target     = interaction.options.getMember('user') as GuildMember | null;
        const reason     = interaction.options.getString('reason') ?? null;
        const deleteDays = interaction.options.getInteger('delete_days') ?? 3;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:memberNotFound')) });
        const err = await validateMod(interaction, target);
        if (err) return interaction.editReply({ ...getMessageLayout(err) });
        if (!target.bannable) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.ban.notBannable')) });
        if (!await requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'ban', guildName: interaction.guild!.name, reason });
            await target.ban({ reason: reason ?? undefined, deleteMessageDays: deleteDays });
            await interaction.guild!.members.unban(target.id, 'Softban - automatic unban');
            await sendModLog({ guildId: interaction.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason: `[Softban] ${reason ?? ''}`.trim() });

            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.ban.softbanSuccess', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, days: deleteDays })) });
        } catch (error) {
            this.container.logger.error(`[MOD SOFTBAN]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:memberNotFound')) });
        const err = await validateMod(message, target);
        if (err) return message.reply({ ...getMessageLayout(err) });
        if (!target.bannable) return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.ban.notBannable')) });

        if (!await requireModConfig(message)) return;

        try {
            await sendModDM({ userId: target.id, action: 'ban', guildName: message.guild!.name, reason });
            await target.ban({ reason: reason ?? undefined, deleteMessageDays: 3 });
            await message.guild!.members.unban(target.id, 'Softban - automatic unban');
            await sendModLog({ guildId: message.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason: `[Softban] ${reason ?? ''}`.trim() });

            return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.ban.softbanSuccessMsg', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag })) });
        } catch (error) {
            this.container.logger.error(`[MOD SOFTBAN]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
