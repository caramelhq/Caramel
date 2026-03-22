import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, checkThresholds } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getSanctionLayout, getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';
import { container } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
    name: 'warn',
    description: 'Warn a member',
})
export class WarnCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.warn';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to warn').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const reason = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        await requireModConfig(interaction.guildId!);

        await sendModDM({ userId: target.id, moderatorId: interaction.user.id, action: 'warn', guild: interaction.guild!, reason });
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'warn', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason });

        await checkThresholds({ 
            guildId: interaction.guildId!, 
            userId: target.id, 
            userTag: target.user.tag, 
            moderatorId: interaction.user.id, 
            guild: interaction.guild!,
            actionTriggered: 'warn'
        });

        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.warn', { 
            emoji: Emojis.warn_emoji, 
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
        await requireModConfig(message.guildId!);

        await sendModDM({ userId: target.id, moderatorId: message.author.id, action: 'warn', guild: message.guild!, reason });
        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'warn', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason });

        await checkThresholds({ 
            guildId: message.guildId!, 
            userId: target.id, 
            userTag: target.user.tag, 
            moderatorId: message.author.id, 
            guild: message.guild!,
            actionTriggered: 'warn'
        });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.warn', { 
            emoji: Emojis.warn_emoji, 
            user: target.toString(), 
            userId: target.id 
        });
        
        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
