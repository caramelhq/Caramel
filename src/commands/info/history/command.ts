import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { prisma } from '../../../database/db';
import { Emojis } from '../../../lib/constants/emojis';
import { getHistoryLayout } from '../../../lib/layouts/infoLayouts';
import { CaramelUserError } from '../../../lib/structures/Errors';
import { requireModPermission } from '../../../command-helpers/mod/shared/permissionGuard';
import infoCommandsEnUs from '../../../lib/i18n/en-US/infocommands.json';
import infoCommandsEsEs from '../../../lib/i18n/es-ES/infocommands.json';

@ApplyOptions<Command.Options>({
    name: 'history',
    description: infoCommandsEnUs.command.history.description,
    preconditions: ['GuildOnly']
})
export class HistoryCommand extends Command {
    public readonly usage = 'infocommands:history.usage';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': infoCommandsEsEs.command.history.description })
                .addUserOption(opt => opt
                    .setName('user')
                    .setDescription(infoCommandsEnUs.command.history.options.user)
                    .setDescriptionLocalizations({ 'es-ES': infoCommandsEsEs.command.history.options.user }))
                .addStringOption(opt => opt
                    .setName('user_id')
                    .setDescription(infoCommandsEnUs.command.history.options.userId)
                    .setDescriptionLocalizations({ 'es-ES': infoCommandsEsEs.command.history.options.userId }))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await requireModPermission(interaction.member as import('discord.js').GuildMember, 'history');

        const userOption   = interaction.options.getUser('user');
        const userIdOption = interaction.options.getString('user_id');
        const targetId     = userOption?.id ?? userIdOption ?? interaction.user.id;

        await interaction.deferReply();

        const logs = await prisma.modLog.findMany({
            where:   { guildId: interaction.guildId!, userId: targetId },
            orderBy: { createdAt: 'desc' },
            take:    10,
        });

        if (logs.length === 0) {
            throw new CaramelUserError('infocommands:history.noSanctions');
        }

        const lines = logs.map(log => {
            const time     = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
            const duration = log.duration ? ` · ${log.duration}` : '';
            const reason   = log.reason   ? ` · ${log.reason}`   : '';
            const caseLabel = log.caseNumber ? `#${log.caseNumber} ` : '';
            return `${Emojis.bullet_emoji} ${caseLabel}\`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
        }).join('\n');

        const title = await resolveKey(interaction, 'infocommands:history.title', { user: targetId });
        return interaction.editReply({ ...getHistoryLayout(title, lines) } as any);
    }

    public async messageRun(message: Message, args: Args) {
        await requireModPermission(message.member!, 'history');

        const target   = await args.pick('user').catch(() => null);
        const targetId = target?.id ?? await args.pick('string').catch(() => message.author.id);

        const logs = await prisma.modLog.findMany({
            where:   { guildId: message.guildId!, userId: targetId },
            orderBy: { createdAt: 'desc' },
            take:    10,
        });

        if (logs.length === 0) {
            throw new CaramelUserError('infocommands:history.noSanctions');
        }

        const lines = logs.map(log => {
            const time     = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
            const duration = log.duration ? ` · ${log.duration}` : '';
            const reason   = log.reason   ? ` · ${log.reason}`   : '';
            const caseLabel = log.caseNumber ? `#${log.caseNumber} ` : '';
            return `${Emojis.bullet_emoji} ${caseLabel}\`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
        }).join('\n');

        const title = await resolveKey(message, 'infocommands:history.title', { user: targetId });
        return message.reply({ ...getHistoryLayout(title, lines) } as any);
    }
}
