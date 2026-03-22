import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, requireMutedRole, validateMod, sendModDM, sendModLog, parseDuration } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'mute',
    description: 'Mute a member (role-based)',
})
export class MuteCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.mute';

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

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        await requireModConfig(interaction.guildId!);
        const mutedRoleId = await requireMutedRole(interaction.guildId!);

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) throw new CaramelUserError('errors:mod_invalidDuration');
        }

        const permanentLabel = await resolveKey(interaction, 'modcommands:mod.mute.permanent');

        await target.roles.add(mutedRoleId, reason ?? undefined);
        await prisma.activeMute.upsert({
            where: { mute_guild_user_unique: { guildId: interaction.guildId!, userId: target.id } },
            create: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, reason, expiresAt: parsed?.expiresAt ?? null },
            update: { moderatorId: interaction.user.id, reason, expiresAt: parsed?.expiresAt ?? null },
        });
        await sendModDM({ userId: target.id, moderatorId: interaction.user.id, action: 'mute', guild: interaction.guild!, reason, duration: parsed?.formatted ?? permanentLabel });
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'mute', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason, duration: parsed?.formatted ?? permanentLabel, expiresAt: parsed?.expiresAt ?? null });

        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.mute', { 
            emoji: Emojis.mute_emoji, 
            user: target.toString(), 
            userId: target.id 
        });

        return interaction.editReply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member');
        const durationInput = await args.pick('string').catch(() => null);
        const reason = await args.rest('string').catch(() => null);

        await validateMod(message, target);
        await requireModConfig(message.guildId!);
        const mutedRoleId = await requireMutedRole(message.guildId!);

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) throw new CaramelUserError('errors:mod_invalidDuration');
        }

        const permanentLabel = await resolveKey(message, 'modcommands:mod.mute.permanent');

        await target.roles.add(mutedRoleId, reason ?? undefined);
        await prisma.activeMute.upsert({
            where: { mute_guild_user_unique: { guildId: message.guildId!, userId: target.id } },
            create: { guildId: message.guildId!, userId: target.id, moderatorId: message.author.id, reason, expiresAt: parsed?.expiresAt ?? null },
            update: { moderatorId: message.author.id, reason, expiresAt: parsed?.expiresAt ?? null },
        });
        await sendModDM({ userId: target.id, moderatorId: message.author.id, action: 'mute', guild: message.guild!, reason, duration: parsed?.formatted ?? permanentLabel });
        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'mute', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason, duration: parsed?.formatted ?? permanentLabel, expiresAt: parsed?.expiresAt ?? null });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.mute', { 
            emoji: Emojis.mute_emoji, 
            user: target.toString(), 
            userId: target.id 
        });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
