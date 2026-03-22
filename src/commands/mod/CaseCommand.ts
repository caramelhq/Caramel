import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { prisma } from '../../database/db';
import { getCaseDetailLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'case',
    description: 'View details of a specific moderation case',
    preconditions: ['GuildOnly']
})
export class CaseCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.case';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addIntegerOption(opt => opt.setName('number').setDescription('Case number').setRequired(true))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const caseNumber = interaction.options.getInteger('number', true);
        await interaction.deferReply({ ephemeral: false });

        const caseData = await prisma.modLog.findFirst({
            where: { guildId: interaction.guildId!, caseNumber }
        });

        if (!caseData) {
            throw new CaramelUserError('modcommands:mod.case.notFound', undefined, { case: caseNumber });
        }

        const labels = {
            title:     await resolveKey(interaction, 'modcommands:mod.case.title', { case: caseNumber }),
            user:      'User',
            moderator: 'Moderator',
            action:    'Action',
            reason:    'Reason',
            duration:  'Duration',
            date:      'Date'
        };

        const noReason = await resolveKey(interaction, 'modcommands:mod.case.noReason');

        return interaction.editReply({
            ...getCaseDetailLayout({
                caseNumber,
                userId:      caseData.userId,
                moderatorId: caseData.moderatorId,
                action:      caseData.action,
                reason:      caseData.reason ?? noReason,
                duration:    caseData.duration,
                createdAt:   caseData.createdAt,
                labels
            })
        } as any);
    }

    public async messageRun(message: Message, args: Args) {
        const caseNumber = await args.pick('integer').catch(() => { throw new CaramelUserError('errors:mod.invalidCaseNumber'); });

        const caseData = await prisma.modLog.findFirst({
            where: { guildId: message.guildId!, caseNumber }
        });

        if (!caseData) {
            throw new CaramelUserError('modcommands:mod.case.notFound', undefined, { case: caseNumber });
        }

        const labels = {
            title:     await resolveKey(message, 'modcommands:mod.case.title', { case: caseNumber }),
            user:      'User',
            moderator: 'Moderator',
            action:    'Action',
            reason:    'Reason',
            duration:  'Duration',
            date:      'Date'
        };

        const noReason = await resolveKey(message, 'modcommands:mod.case.noReason');

        return message.reply({
            ...getCaseDetailLayout({
                caseNumber,
                userId:      caseData.userId,
                moderatorId: caseData.moderatorId,
                action:      caseData.action,
                reason:      caseData.reason ?? noReason,
                duration:    caseData.duration,
                createdAt:   caseData.createdAt,
                labels
            })
        } as any);
    }
}

