import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { prisma } from '../../database/db';
import { Emojis } from '../../lib/constants/emojis';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { getHistoryLayout } from '../../lib/layouts/infoLayouts';

export class HistoryCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(opt => opt.setName('user').setDescription('User to check'))
                .addStringOption(opt => opt.setName('user_id').setDescription('User ID (if not in server)'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const userOption   = interaction.options.getUser('user');
        const userIdOption = interaction.options.getString('user_id');
        const targetId     = userOption?.id ?? userIdOption ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!targetId) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'infocommands:history.specifyUser')) });

        try {
            const logs = await prisma.modLog.findMany({
                where:   { guildId: interaction.guildId!, userId: targetId },
                orderBy: { createdAt: 'desc' },
                take:    10,
            });

            if (logs.length === 0) return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'infocommands:history.noSanctions')) });

            const lines = logs.map(log => {
                const time     = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
                const duration = log.duration ? ` · ${log.duration}` : '';
                const reason   = log.reason   ? ` · ${log.reason}`   : '';
                return `${Emojis.bullet_emoji} \`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
            }).join('\n');

            const title = await resolveKey(interaction, 'infocommands:history.title', { user: targetId });
            return interaction.editReply({ ...getHistoryLayout(title, lines) } as any);
        } catch (error) {
            this.container.logger.error(`[MOD HISTORY]`, error);
            return interaction.editReply({ ...getMessageLayout(await resolveKey(interaction, 'errors:unexpected')) });
        }
    }

    public async messageRun(message: Message, args: Args) {
        const target   = await args.pick('user').catch(() => null);
        const targetId = target?.id ?? await args.pick('string').catch(() => null);

        if (!targetId) return message.reply({ ...getMessageLayout(await resolveKey(message, 'infocommands:history.specifyUser')) });

        try {
            const logs = await prisma.modLog.findMany({
                where:   { guildId: message.guildId!, userId: targetId },
                orderBy: { createdAt: 'desc' },
                take:    10,
            });

            if (logs.length === 0) return message.reply({ ...getMessageLayout(await resolveKey(message, 'infocommands:history.noSanctions')) });

            const lines = logs.map(log => {
                const time     = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
                const duration = log.duration ? ` · ${log.duration}` : '';
                const reason   = log.reason   ? ` · ${log.reason}`   : '';
                return `${Emojis.bullet_emoji} \`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
            }).join('\n');

            const title = await resolveKey(message, 'infocommands:history.title', { user: targetId });
            return message.reply({ ...getHistoryLayout(title, lines) } as any);
        } catch (error) {
            this.container.logger.error(`[MOD HISTORY]`, error);
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'errors:unexpected')) });
        }
    }
}
