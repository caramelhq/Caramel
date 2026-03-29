import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getUserInfoLayout } from '../../../lib/layouts/infoLayouts';
import { requireModPermission } from '../../../command-helpers/mod/shared/permissionGuard';
import { type Message, type GuildMember, type User, time, TimestampStyles } from 'discord.js';
import infoCommandsEnUs from '../../../lib/i18n/en-US/infocommands.json';
import infoCommandsEsEs from '../../../lib/i18n/es-ES/infocommands.json';

@ApplyOptions<Command.Options>({
    name: 'user',
    description: infoCommandsEnUs.command.user.description
})
export class UserCommand extends Command {
    public readonly usage = 'infocommands:user.usage';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': infoCommandsEsEs.command.user.description })
                .addUserOption((option) =>
                    option
                        .setName('target')
                    .setDescription(infoCommandsEnUs.command.user.options.target)
                    .setDescriptionLocalizations({ 'es-ES': infoCommandsEsEs.command.user.options.target })
                        .setRequired(false)
                )
                .setIntegrationTypes([0, 1])
                .setContexts([0, 1, 2])
        );
    }

    private async getUserData(
        interactionOrMessage: Command.ChatInputCommandInteraction | Message,
        targetUser: User,
        targetMember: GuildMember | null
    ) {
        const [joinedDiscord, joinedServer, highestRole, viewHistoryBtn, addNoteBtn, notInServer, none] = await Promise.all([
            resolveKey(interactionOrMessage, 'infocommands:user.labels.joinedDiscord'),
            resolveKey(interactionOrMessage, 'infocommands:user.labels.joinedServer'),
            resolveKey(interactionOrMessage, 'infocommands:user.labels.highestRole'),
            resolveKey(interactionOrMessage, 'infocommands:user.labels.viewHistory'),
            resolveKey(interactionOrMessage, 'infocommands:user.labels.addNote'),
            resolveKey(interactionOrMessage, 'infocommands:user.labels.notInServer'),
            resolveKey(interactionOrMessage, 'infocommands:user.labels.none'),
        ]);
        const labels = { joinedDiscord, joinedServer, highestRole, viewHistoryBtn, addNoteBtn };

        const createdDateStr = `${time(targetUser.createdAt, TimestampStyles.LongDate)} (${time(targetUser.createdAt, TimestampStyles.RelativeTime)})`;
        
        let joinedDateStr  = notInServer;
        let highestRoleStr = none;
        let accentColor    = 0xF9A825; // Base color fallback (Caramel Yellow)

        if (targetMember) {
            if (targetMember.joinedAt) {
                joinedDateStr = `${time(targetMember.joinedAt, TimestampStyles.LongDate)} (${time(targetMember.joinedAt, TimestampStyles.RelativeTime)})`;
            }

            const highestRole = targetMember.roles.highest;
            if (highestRole.id !== targetMember.guild.id) { // Not everyone
                highestRoleStr = `<@&${highestRole.id}>`;
                if (highestRole.color) {
                    accentColor = highestRole.color;
                }
            }
        }

        const avatarUrl = targetMember?.displayAvatarURL({ size: 1024 }) || targetUser.displayAvatarURL({ size: 1024 });
        const invokerId = 'user' in interactionOrMessage ? interactionOrMessage.user.id : interactionOrMessage.author.id;

        return getUserInfoLayout(
            targetUser.id,
            targetUser.username,
            avatarUrl,
            createdDateStr,
            joinedDateStr,
            highestRoleStr,
            accentColor,
            invokerId,
            labels
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        if (interaction.guildId && interaction.member) {
            await requireModPermission(interaction.member as GuildMember, 'user');
        }

        const targetUser = interaction.options.getUser('target') ?? interaction.user;
        const targetMember = interaction.options.getMember('target') as GuildMember | null
            ?? (targetUser.id === interaction.user.id ? interaction.member as GuildMember : null);

        const layout = await this.getUserData(interaction, targetUser, targetMember);
        return interaction.reply({ ...layout } as any);
    }

    public override async messageRun(message: Message, args: Args) {
        if (message.guild && message.member) {
            await requireModPermission(message.member, 'user');
        }

        const targetUser = await args.pick('user').catch(() => message.author);
        let targetMember: GuildMember | null = null;

        if (message.guild) {
            targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        }

        const layout = await this.getUserData(message, targetUser, targetMember);
        return message.reply({ ...layout } as any);
    }
}
