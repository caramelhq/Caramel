import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, checkThresholds, parseDuration } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'timeout',
    description: 'Timeout a member',
})
export class TimeoutCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.timeout';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to timeout').setRequired(true))
                .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 10m, 1h) - Max 28 days').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const durationInput = interaction.options.getString('duration', true);
        const reason = interaction.options.getString('reason') ?? null;
        
        await interaction.deferReply({ ephemeral: false });

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        await requireModConfig(interaction.guildId!);

        const duration = parseDuration(durationInput);
        if (!duration) throw new CaramelUserError('errors:mod_invalidDuration');
        if (duration.ms > 28 * 24 * 60 * 60 * 1000) throw new CaramelUserError('modcommands:mod.timeout.tooLong');

        await sendModDM({ userId: target.id, moderatorId: interaction.user.id, action: 'timeout', guild: interaction.guild!, reason, duration: duration.formatted });
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'timeout', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason, duration: duration.formatted, expiresAt: duration.expiresAt });

        await target.timeout(duration.ms, reason ?? undefined);
        
        await prisma.activeMute.upsert({
            where: { mute_guild_user_unique: { guildId: interaction.guildId!, userId: target.id } },
            create: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, reason, expiresAt: duration.expiresAt, caseNumber: caseNumber ?? 0 },
            update: { moderatorId: interaction.user.id, reason, expiresAt: duration.expiresAt, caseNumber: caseNumber ?? 0 },
        });

        await checkThresholds({ 
            guildId: interaction.guildId!, 
            userId: target.id, 
            userTag: target.user.tag, 
            moderatorId: interaction.user.id, 
            guild: interaction.guild!, 
            actionTriggered: 'timeout'
        });

        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.timeout', { 
            emoji: Emojis.timeout_emoji, 
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
        const durationInput = await args.pick('string').catch(() => { throw new CaramelUserError('errors:mod_invalidDuration'); });
        const reason = await args.rest('string').catch(() => null);

        await validateMod(message, target);
        await requireModConfig(message.guildId!);

        const duration = parseDuration(durationInput);
        if (!duration) throw new CaramelUserError('errors:mod_invalidDuration');
        if (duration.ms > 28 * 24 * 60 * 60 * 1000) throw new CaramelUserError('modcommands:mod.timeout.tooLong');

        await sendModDM({ userId: target.id, moderatorId: message.author.id, action: 'timeout', guild: message.guild!, reason, duration: duration.formatted });
        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'timeout', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason, duration: duration.formatted, expiresAt: duration.expiresAt });

        await target.timeout(duration.ms, reason ?? undefined);

        await prisma.activeMute.upsert({
            where: { mute_guild_user_unique: { guildId: message.guildId!, userId: target.id } },
            create: { guildId: message.guildId!, userId: target.id, moderatorId: message.author.id, reason, expiresAt: duration.expiresAt, caseNumber: caseNumber ?? 0 },
            update: { moderatorId: message.author.id, reason, expiresAt: duration.expiresAt, caseNumber: caseNumber ?? 0 },
        });

        await checkThresholds({ 
            guildId: message.guildId!, 
            userId: target.id, 
            userTag: target.user.tag, 
            moderatorId: message.author.id, 
            guild: message.guild!, 
            actionTriggered: 'timeout'
        });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.timeout', { 
            emoji: Emojis.timeout_emoji, 
            user: target.toString(), 
            userId: target.id 
        });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
