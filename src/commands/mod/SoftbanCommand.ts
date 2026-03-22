import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, checkThresholds } from '../../lib/utils/ModUtils';
import { Emojis } from '../../lib/constants/emojis';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'softban',
    description: 'Softban a member',
})
export class SoftbanCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.softban';

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

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        if (!target.bannable) throw new CaramelUserError('modcommands:mod.ban.notBannable');
        await requireModConfig(interaction.guildId!);

        await sendModDM({ userId: target.id, moderatorId: interaction.user.id, action: 'softban', guild: interaction.guild!, reason });
        await target.ban({ reason: reason ?? undefined, deleteMessageDays: deleteDays });
        
        const auditReason = await resolveKey(interaction, 'modcommands:mod.ban.softbanAuditReason');
        await interaction.guild!.members.unban(target.id, auditReason);
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'softban', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason: reason ?? null });
        await checkThresholds({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, actionTriggered: 'softban' });

        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.softban', { 
            emoji: Emojis.softban_emoji, 
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
        const reason = await args.rest('string').catch(() => null);

        await validateMod(message, target);
        if (!target.bannable) throw new CaramelUserError('modcommands:mod.ban.notBannable');
        await requireModConfig(message.guildId!);

        await sendModDM({ userId: target.id, moderatorId: message.author.id, action: 'softban', guild: message.guild!, reason });
        await target.ban({ reason: reason ?? undefined, deleteMessageDays: 3 });
        
        const auditReason = await resolveKey(message, 'modcommands:mod.ban.softbanAuditReason');
        await message.guild!.members.unban(target.id, auditReason);
        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'softban', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason: reason ?? null });
        await checkThresholds({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, actionTriggered: 'softban' });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.softban', { 
            emoji: Emojis.softban_emoji, 
            user: target.toString(), 
            userId: target.id 
        });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
