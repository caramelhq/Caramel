import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, applyMute, parseDuration } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getStatusUpdateLayout, getCancelledLayout, getTimeoutLayout } from '../../lib/layouts/modCommandLayouts';

export class TimeoutCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to timeout').setRequired(true))
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
        if (!target.moderatable) return interaction.editReply({ ...getMessageLayout('`❌` I cannot timeout this member. Check my role position.') });
        if (!await requireModConfig(interaction)) return;

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return interaction.editReply({ ...getMessageLayout('`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.') });
        }

        try {
            await applyMute({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            const content = await resolveKey(interaction, 'modcommands:mod.mute.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, duration: parsed ? ` for **${parsed.formatted}**` : ' permanently' });
            return interaction.editReply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD TIMEOUT]`, error);
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

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return message.reply({ ...getMessageLayout('`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.') });
        }

        if (!await requireModConfig(message)) return;

        try {
            await applyMute({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            const content = await resolveKey(message, 'modcommands:mod.mute.success', { emoji: Emojis.enabled_setting_emoji, user: target.user.tag, duration: parsed ? ` for **${parsed.formatted}**` : ' permanently' });
            return message.reply({ ...getMessageLayout(content) });
        } catch (error) {
            this.container.logger.error(`[MOD TIMEOUT]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
