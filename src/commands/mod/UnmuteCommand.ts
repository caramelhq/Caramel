import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModLog } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { CacheManager } from '../../database/CacheManager';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout, getCancelledLayout, getTimeoutLayout } from '../../lib/layouts/modCommandLayouts';

export class UnmuteCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to unmute').setRequired(true))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:memberNotFound')) });
        
        const isAllowed = await requireModConfig(interaction);
        if (!isAllowed) return;

        const { mutedRoleId } = await CacheManager.getModConfig(interaction.guildId!);
        if (!mutedRoleId) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.unmute.roleMissing')) });

        if (!target.roles.cache.has(mutedRoleId)) {
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.mute.notMuted')) });
        }

        const executor = await interaction.guild!.members.fetch(interaction.user.id);
        if (target.roles.highest.position >= executor.roles.highest.position) {
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.mute.unmuteHigherRole')) });
        }

        try {
            await target.roles.remove(mutedRoleId, 'Unmuted');
            await prisma.activeMute.deleteMany({ where: { guildId: interaction.guildId!, userId: target.id } });
            await sendModLog({ guildId: interaction.guildId!, action: 'unmute', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason: null });

            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.mute.unmuteSuccess', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag })) });
        } catch (error) {
            this.container.logger.error(`[MOD UNMUTE]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;

        if (!target) return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:memberNotFound')) });

        const isAllowed = await requireModConfig(message);
        if (!isAllowed) return;

        const { mutedRoleId } = await CacheManager.getModConfig(message.guildId!);
        if (!mutedRoleId) return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.unmute.roleMissing')) });

        if (!target.roles.cache.has(mutedRoleId)) {
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.mute.notMuted')) });
        }

        const executor = message.member!;
        if (target.roles.highest.position >= executor.roles.highest.position) {
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.mute.unmuteHigherRole')) });
        }

        try {
            await target.roles.remove(mutedRoleId, 'Unmuted');
            await prisma.activeMute.deleteMany({ where: { guildId: message.guildId!, userId: target.id } });
            await sendModLog({ guildId: message.guildId!, action: 'unmute', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason: null });

            return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.mute.unmuteSuccess', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag })) });
        } catch (error) {
            this.container.logger.error(`[MOD UNMUTE]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
