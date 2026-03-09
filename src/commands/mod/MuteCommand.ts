import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, parseDuration } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { CacheManager } from '../../database/CacheManager';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout, getCancelledLayout, getTimeoutLayout } from '../../lib/layouts/modCommandLayouts';

@ApplyOptions<Command.Options>({
    description: 'Mute a member (role-based)',
})
export class MuteCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to mute').setRequired(true))
                .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 30m, 2h, 1d, 1d2h30m)'))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const durationInput = interaction.options.getString('duration') ?? null;
        const reason = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:memberNotFound')) });
        const err = await validateMod(interaction, target);
        if (err) return interaction.editReply({ ...getMessageLayout(err) });
        
        const isAllowed = await requireModConfig(interaction);
        if (!isAllowed) return;

        const { mutedRoleId } = await CacheManager.getModConfig(interaction.guildId!);
        if (!mutedRoleId) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'modcommands:mod.mute.roleMissing')) });

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return interaction.editReply({ ...getMessageLayout('`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.') });
        }

        try {
            await target.roles.add(mutedRoleId, reason ?? undefined);
            await prisma.activeMute.upsert({
                where: { mute_guild_user_unique: { guildId: interaction.guildId!, userId: target.id } },
                create: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, reason, expiresAt: parsed?.expiresAt ?? null },
                update: { moderatorId: interaction.user.id, reason, expiresAt: parsed?.expiresAt ?? null },
            });
            await sendModDM({ userId: target.id, action: 'mute', guildName: interaction.guild!.name, reason, duration: parsed?.formatted ?? 'Permanent' });
            await sendModLog({ guildId: interaction.guildId!, action: 'mute', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            const content = await resolveKey(interaction, 'modcommands:mod.mute.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, duration: parsed ? ` for **${parsed.formatted}**` : ' permanently' });
            return interaction.editReply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD MUTE]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const durationInput = await args.pick('string').catch(() => null);
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:memberNotFound')) });
        const err = await validateMod(message, target);
        if (err) return message.reply({ ...getMessageLayout(err) });

        const isAllowed = await requireModConfig(message);
        if (!isAllowed) return;

        const { mutedRoleId } = await CacheManager.getModConfig(message.guildId!);
        if (!mutedRoleId) return message.reply({ ...getMessageLayout(await resolveKey(message, 'modcommands:mod.mute.roleMissing')) });

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return message.reply({ ...getMessageLayout('`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.') });
        }

        try {
            await target.roles.add(mutedRoleId, reason ?? undefined);
            await prisma.activeMute.upsert({
                where: { mute_guild_user_unique: { guildId: message.guildId!, userId: target.id } },
                create: { guildId: message.guildId!, userId: target.id, moderatorId: message.author.id, reason, expiresAt: parsed?.expiresAt ?? null },
                update: { moderatorId: message.author.id, reason, expiresAt: parsed?.expiresAt ?? null },
            });
            await sendModDM({ userId: target.id, action: 'mute', guildName: message.guild!.name, reason, duration: parsed?.formatted ?? 'Permanent' });
            await sendModLog({ guildId: message.guildId!, action: 'mute', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            const content = await resolveKey(message, 'modcommands:mod.mute.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, duration: parsed ? ` for **${parsed.formatted}**` : ' permanently' });
            return message.reply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD MUTE]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
