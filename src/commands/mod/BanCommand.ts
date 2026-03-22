import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, checkThresholds } from '../../lib/utils/ModUtils';
import { Emojis } from '../../lib/constants/emojis';
import { ContainerComponent, TextDisplayComponent } from '../../lib/layouts/ui';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'ban',
    description: 'Ban a member',
})
export class BanCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.ban';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to ban').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target     = interaction.options.getMember('user') as GuildMember | null;
        const reason     = interaction.options.getString('reason') ?? null;
        const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
        
        await interaction.deferReply({ ephemeral: false });

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        if (!target.bannable) throw new CaramelUserError('modcommands:mod.ban.notBannable');
        await requireModConfig(interaction.guildId!);

        await sendModDM({ userId: target.id, moderatorId: interaction.user.id, action: 'ban', guild: interaction.guild!, reason });
        await target.ban({ reason: reason ?? undefined, deleteMessageDays: deleteDays });
        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.ban', { 
            emoji: Emojis.ban_emoji, 
            user: target.toString(),
            userId: target.id 
        });

        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason });
        await checkThresholds({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, actionTriggered: 'ban' });

        return interaction.editReply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }

    public async messageRun(message: Message, args: Args) {
        const target = await args.pick('member');
        const reason = await args.rest('string').catch(() => null);

        await validateMod(message, target);
        if (!target.bannable) throw new CaramelUserError('modcommands:mod.ban.notBannable');
        await requireModConfig(message.guildId!);

        await sendModDM({ userId: target.id, moderatorId: message.author.id, action: 'ban', guild: message.guild!, reason });
        await target.ban({ reason: reason ?? undefined });
        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.ban', { 
            emoji: Emojis.ban_emoji, 
            user: target.toString(),
            userId: target.id 
        });

        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason });
        await checkThresholds({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, actionTriggered: 'ban' });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
