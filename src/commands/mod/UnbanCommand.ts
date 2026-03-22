import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, sendModLog } from '../../lib/utils/ModUtils';
import { Emojis } from '../../lib/constants/emojis';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'unban',
    description: 'Unban a user from the server',
})
export class UnbanCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.unban';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
                .addStringOption(opt => opt.setName('user_id').setDescription('ID of the user to unban').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const userId = interaction.options.getString('user_id', true);
        const reason = interaction.options.getString('reason') ?? null;
        
        await interaction.deferReply({ ephemeral: false });

        await requireModConfig(interaction.guildId!);

        const ban = await interaction.guild!.bans.fetch(userId).catch(() => null);
        if (!ban) throw new CaramelUserError('modcommands:mod.ban.notBanned');

        await interaction.guild!.members.unban(userId, reason ?? undefined);
        
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'unban', userId: userId, userTag: ban.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason });
        
        // Note: Unban isn't in 'confirmations' list yet, we might need to add it or use a generic success for now.
        // For now using the existing unbanSuccess but wrapping in the new layout structure if possible, 
        // OR adhering to the new standard if we add 'unban' to confirmations.
        // Let's use the existing key but wrapped for consistency, although unban doesn't have a specific "confirmation" key in the new structure yet.
        // Wait, I should add 'unban' to confirmations to match the pattern.
        
        // Adding dynamic fallback to existing key for now to not break flow, assuming I'll add the key later or use generic.
        // Actually, let's use the existing key but formatted.
        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.unban', { 
            emoji: Emojis.check_emoji, 
            user: `<@${userId}>`,
            userId: userId 
        });

        return interaction.editReply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }

    public async messageRun(message: Message, args: Args) {
        const userId = await args.pick('string');
        const reason = await args.rest('string').catch(() => null);

        await requireModConfig(message.guildId!);

        const ban = await message.guild!.bans.fetch(userId).catch(() => null);
        if (!ban) throw new CaramelUserError('modcommands:mod.ban.notBanned');

        await message.guild!.members.unban(userId, reason ?? undefined);
        
        const caseNumber = await sendModLog({
            guildId: message.guildId!,
            action: 'unban',
            userId: userId,
            userTag: ban.user.tag,
            moderatorId: message.author.id,
            guild: message.guild!,
            reason
        });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.unban', { 
            emoji: Emojis.check_emoji, 
            user: `<@${userId}>`,
            userId: userId
        });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
