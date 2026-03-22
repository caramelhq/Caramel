import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { prisma } from '../database/db';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../lib/layouts/defaultLayout';
import { getHistoryLayout } from '../lib/layouts/infoLayouts';
import { Emojis } from '../lib/constants/emojis';
import { CaramelUserError } from '../lib/structures/Errors';


export class HistoryButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith('mod_history_')) return this.none();

        const parts = interaction.customId.replace('mod_history_', '').split('_');
        if (parts.length !== 2) return this.none();

        return this.some({ targetId: parts[0], invokerId: parts[1] });
    }

    public async run(interaction: ButtonInteraction, { targetId, invokerId }: { targetId: string, invokerId: string }) {
        if (interaction.user.id !== invokerId) {
            throw new CaramelUserError('infocommands:errors.notYourButton');
        }

        await interaction.deferReply({ ephemeral: false });

        const logs = await prisma.modLog.findMany({
            where: { guildId: interaction.guildId!, userId: targetId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        if (logs.length === 0) {
            throw new CaramelUserError('infocommands:history.noSanctions');
        }

        const lines = logs.map(log => {
            const time = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
            const duration = log.duration ? ` · ${log.duration}` : '';
            const reason = log.reason ? ` · ${log.reason}` : '';
            return `${Emojis.bullet_emoji} \`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
        }).join('\n');

        const title = await resolveKey(interaction, 'infocommands:history.title', { user: targetId });
        return interaction.editReply({ ...getHistoryLayout(title, lines) } as any);
    }
}
