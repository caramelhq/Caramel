import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModLog } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { ContainerComponent, TextDisplayComponent } from '../../lib/layouts/ui';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'remove-case',
    description: 'Remove a moderation case',
})
export class RemoveCaseCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.removeCase';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addIntegerOption(opt => opt.setName('case_number').setDescription('Case number to remove').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for removal'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const caseNumber = interaction.options.getInteger('case_number', true);
        const reason = interaction.options.getString('reason') ?? null;
        
        await interaction.deferReply({ ephemeral: false });

        await requireModConfig(interaction.guildId!);

        const modLog = await prisma.modLog.findFirst({
            where: { guildId: interaction.guildId!, caseNumber: caseNumber }
        });

        if (!modLog) throw new CaramelUserError('modcommands:mod.case.notFound');

        await prisma.modLog.delete({
            where: { id: modLog.id }
        });

        // Decrement case count? Usually better not to, to preserve history integrity, but depends on preference.
        // Assuming we just delete the record.

        // Log the deletion action itself? Optional but good practice.
        // For now just confirming deletion.

        const successMsg = await resolveKey(interaction, 'modcommands:mod.case.removed', { emoji: Emojis.check_emoji, case: caseNumber });
        return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(successMsg)])] });
    }

    public async messageRun(message: Message, args: Args) {
        const caseNumber = await args.pick('integer').catch(() => { throw new CaramelUserError('modcommands:mod.case.invalidNumber'); });
        const reason = await args.rest('string').catch(() => null);

        await requireModConfig(message.guildId!);

        const modLog = await prisma.modLog.findFirst({
            where: { guildId: message.guildId!, caseNumber: caseNumber }
        });

        if (!modLog) throw new CaramelUserError('modcommands:mod.case.notFound');

        await prisma.modLog.delete({
            where: { id: modLog.id }
        });

        const successMsg = await resolveKey(message, 'modcommands:mod.case.removed', { emoji: Emojis.check_emoji, case: caseNumber });
        return message.reply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(successMsg)])] });
    }
}
