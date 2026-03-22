import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, validateMod, sendModDM, sendModLog, checkThresholds } from '../../lib/utils/ModUtils';
import { Emojis } from '../../lib/constants/emojis';
import { getStaffConfirmationLayout } from '../../lib/layouts/modCommandLayouts';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'kick',
    description: 'Kick a member',
})
export class KickCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.kick';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('Member to kick').setRequired(true))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const reason = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) throw new CaramelUserError('errors:memberNotFound');
        
        await validateMod(interaction, target);
        if (!target.kickable) throw new CaramelUserError('modcommands:mod.kick.notKickable');
        await requireModConfig(interaction.guildId!);

        await sendModDM({ userId: target.id, moderatorId: interaction.user.id, action: 'kick', guild: interaction.guild!, reason });
        await target.kick(reason ?? undefined);
        const caseNumber = await sendModLog({ guildId: interaction.guildId!, action: 'kick', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason });
        await checkThresholds({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, actionTriggered: 'kick' });

        const successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.kick', { 
            emoji: Emojis.kick_emoji, 
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
        const reason = await args.rest('string').catch(() => null);

        await validateMod(message, target);
        if (!target.kickable) throw new CaramelUserError('modcommands:mod.kick.notKickable');
        await requireModConfig(message.guildId!);

        await sendModDM({ userId: target.id, moderatorId: message.author.id, action: 'kick', guild: message.guild!, reason });
        await target.kick(reason ?? undefined);
        const caseNumber = await sendModLog({ guildId: message.guildId!, action: 'kick', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason });
        await checkThresholds({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, actionTriggered: 'kick' });

        const successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.kick', { 
            emoji: Emojis.kick_emoji, 
            user: target.toString(), 
            userId: target.id 
        });

        return message.reply(getStaffConfirmationLayout({
            content: successMsg,
            caseId: caseNumber ?? 0
        }));
    }
}
