import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getUserInfoLayout } from '../../lib/layouts/infoLayouts';
import { type Message, type GuildMember, type User, time, TimestampStyles } from 'discord.js';

@ApplyOptions<Command.Options>({
    name: 'user',
    description: 'Get information about a user'
})
export class UserCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addUserOption((option) =>
                    option
                        .setName('target')
                        .setDescription('The user to inspect')
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
        // Build the labels required by the layout
        const labels = {
            joinedDiscord:  await resolveKey(interactionOrMessage, 'infocommands:user.labels.joinedDiscord'),
            joinedServer:   await resolveKey(interactionOrMessage, 'infocommands:user.labels.joinedServer'),
            highestRole:    await resolveKey(interactionOrMessage, 'infocommands:user.labels.highestRole'),
            viewHistoryBtn: await resolveKey(interactionOrMessage, 'infocommands:user.labels.viewHistoryBtn'),
            addNoteBtn:     await resolveKey(interactionOrMessage, 'infocommands:user.labels.addNoteBtn'),
        };

        // Format Discord dates
        const createdDateStr = `${time(targetUser.createdAt, TimestampStyles.LongDate)} (${time(targetUser.createdAt, TimestampStyles.RelativeTime)})`;
        
        let joinedDateStr  = 'Not in server';
        let highestRoleStr = '`None`';
        let accentColor    = 0xF9A825; // Base color fallback (Caramel Yellow)

        if (targetMember) {
            if (targetMember.joinedAt) {
                joinedDateStr = `${time(targetMember.joinedAt, TimestampStyles.LongDate)} (${time(targetMember.joinedAt, TimestampStyles.RelativeTime)})`;
            }
            
            // Fixes highest role display by getting highest hoisted or just highest
            const highestRole = targetMember.roles.highest;
            if (highestRole.id !== targetMember.guild.id) { // Not everyone
                highestRoleStr = `<@&${highestRole.id}>`;
                if (highestRole.color) {
                    accentColor = highestRole.color;
                }
            }
        }

        const avatarUrl = targetMember?.displayAvatarURL({ size: 1024 }) || targetUser.displayAvatarURL({ size: 1024 });
        
        // Extract the user ID of the person executing this command
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
        const targetUser = interaction.options.getUser('target') ?? interaction.user;
        const targetMember = interaction.options.getMember('target') as GuildMember | null 
            ?? (targetUser.id === interaction.user.id ? interaction.member as GuildMember : null);

        const layout = await this.getUserData(interaction, targetUser, targetMember);
        return interaction.reply({ ...layout, ephemeral: false } as any);
    }

    public override async messageRun(message: Message, args: Args) {
        // Try to pick a user mention or ID, otherwise default to the author
        const targetUser = await args.pick('user').catch(() => message.author);
        let targetMember: GuildMember | null = null;
        
        try {
            // Only try to fetch the member if we are in a guild
            if (message.guild) {
                targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
            }
        } catch {
            targetMember = null;
        }

        const layout = await this.getUserData(message, targetUser, targetMember);
        return message.reply({ ...layout } as any);
    }
}

