import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModLog } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { CacheManager } from '../../database/CacheManager';
import { Emojis } from '../../lib/constants/emojis';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'unmute',
    description: 'Unmute a member',
})
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

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        await requireModConfig(interaction.guildId!);

        const { mutedRoleId } = await CacheManager.getModConfig(interaction.guildId!);
        if (!mutedRoleId) throw new CaramelUserError('modcommands:mod.unmute.roleMissing');

        if (!target.roles.cache.has(mutedRoleId)) throw new CaramelUserError('modcommands:mod.mute.notMuted');

        const auditReason = await resolveKey(interaction, 'modcommands:mod.mute.auditReason');
        await target.roles.remove(mutedRoleId, auditReason);
        await prisma.activeMute.deleteMany({ where: { guildId: interaction.guildId!, userId: target.id } });
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'unmute', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason: null });

        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.unmute', { 
            emoji: Emojis.unmute_emoji, 
            user: target.toString(),
            userId: target.id 
        });

        return interaction.editReply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member').catch(() => { throw new CaramelUserError('errors:memberNotFound'); });

        await validateMod(message, target);
        await requireModConfig(message.guildId!);

        const { mutedRoleId } = await CacheManager.getModConfig(message.guildId!);
        if (!mutedRoleId) throw new CaramelUserError('modcommands:mod.unmute.roleMissing');

        if (!target.roles.cache.has(mutedRoleId)) throw new CaramelUserError('modcommands:mod.mute.notMuted');

        const auditReason = await resolveKey(message, 'modcommands:mod.mute.auditReason');
        await target.roles.remove(mutedRoleId, auditReason);
        await prisma.activeMute.deleteMany({ where: { guildId: message.guildId!, userId: target.id } });
        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'unmute', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason: null });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.unmute', { 
            emoji: Emojis.unmute_emoji, 
            user: target.toString(),
            userId: target.id 
        });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
