import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout, getCancelledLayout, getTimeoutLayout } from '../../lib/layouts/modCommandLayouts';

export class KickCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to kick').setRequired(true))
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
        if (!target.kickable) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.kick.notKickable')) });
        if (!await requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'kick', guildName: interaction.guild!.name, reason });
            await target.kick(reason ?? undefined);
            await sendModLog({ guildId: interaction.guildId!, action: 'kick', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason });

            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.kick.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag })) });
        } catch (error) {
            this.container.logger.error(`[MOD KICK]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:memberNotFound')) });
        const err = await validateMod(message, target);
        if (err) return message.reply({ ...getMessageLayout(err) });
        if (!target.kickable) return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.kick.notKickable')) });

        if (!await requireModConfig(message)) return;

        try {
            await sendModDM({ userId: target.id, action: 'kick', guildName: message.guild!.name, reason });
            await target.kick(reason ?? undefined);
            await sendModLog({ guildId: message.guildId!, action: 'kick', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason });

            return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.kick.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag })) });
        } catch (error) {
            this.container.logger.error(`[MOD KICK]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
