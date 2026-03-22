import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { addSilentBan, removeSilentBan, listSilentBans } from '../../services/SilentBanService';
import { getSilentBanLayout } from '../../lib/layouts/modCommandLayouts';
import { Emojis } from '../../lib/constants/emojis';
import { CaramelUserError } from '../../lib/structures/Errors';


// Constants ──────────────────

const DURATION_MAP: Record<string, number> = {
    '30m': 30 * 60 * 1000,
    '1h':   1 * 60 * 60 * 1000,
    '6h':   6 * 60 * 60 * 1000,
    '1d':  24 * 60 * 60 * 1000,
    '7d':   7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};


// Silentban command ──────────────────

@ApplyOptions<Subcommand.Options>({
    name: 'silentban',
    description: 'Manage silent bans',
    preconditions: ['GuildOnly'],
    subcommands: [
        { name: 'add',    chatInputRun: 'chatInputAdd'    },
        { name: 'remove', chatInputRun: 'chatInputRemove' },
        { name: 'list',   chatInputRun: 'chatInputList'   }
    ]
})
export class SilentBanCommand extends Subcommand {
    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((sub) =>
                    sub
                        .setName('add')
                        .setDescription('Apply a silent ban to a user')
                        .addUserOption((opt) => opt.setName('user').setDescription('The user to silent ban').setRequired(true))
                        .addStringOption((opt) =>
                            opt
                                .setName('duration')
                                .setDescription('Ban duration')
                                .addChoices(
                                    { name: '30 minutes', value: '30m' },
                                    { name: '1 hour',     value: '1h'  },
                                    { name: '6 hours',    value: '6h'  },
                                    { name: '1 day',      value: '1d'  },
                                    { name: '7 days',     value: '7d'  },
                                    { name: '30 days',    value: '30d' }
                                )
                        )
                        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the silent ban'))
                )
                .addSubcommand((sub) =>
                    sub
                        .setName('remove')
                        .setDescription('Remove a silent ban')
                        .addUserOption((opt) => opt.setName('user').setDescription('The user to unban').setRequired(true))
                )
                .addSubcommand((sub) => sub.setName('list').setDescription('List all active silent bans'))
        );
    }


    // Add ──────────

    public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });

        const target   = interaction.options.getUser('user', true);
        const duration = interaction.options.getString('duration');
        const reason   = interaction.options.getString('reason')?.slice(0, 500) ?? null;

        if (target.id === interaction.user.id) throw new CaramelUserError('modcommands:mod.silentban.self');
        if (target.bot) throw new CaramelUserError('modcommands:mod.silentban.bot');

        const durationMs = duration ? DURATION_MAP[duration] : null;

        const ban = await addSilentBan(interaction.guildId!, target.id, interaction.user.id, reason, durationMs);
        const permanentLabel = await resolveKey(interaction, 'modcommands:mod.mute.permanent');
        return interaction.editReply(getSilentBanLayout('add', { userTag: target.username, duration: duration ?? permanentLabel, reason, caseNumber: ban.caseNumber }));
    }


    // Remove ──────────

    public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });
        const target = interaction.options.getUser('user', true);

        await removeSilentBan(interaction.guildId!, target.id);
        return interaction.editReply(getSilentBanLayout('remove', { userTag: target.username }));
    }


    // List ──────────

    public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });

        const bans = await listSilentBans(interaction.guildId!);
        if (bans.length === 0) throw new CaramelUserError('modcommands:mod.silentban.noBans');

        const listText = bans.map(ban =>
            `${Emojis.bullet_emoji} <@${ban.userId}> › expires ${this.formatExpiry(ban.expiresAt, interaction)}`
        ).join('\n');

        return interaction.editReply(getSilentBanLayout('list', { count: bans.length, listText }));
    }


    // Formats a date as a Discord timestamp ──────────

    private async formatExpiry(date: Date | null, interaction: Subcommand.ChatInputCommandInteraction) {
        if (!date) return resolveKey(interaction, 'modcommands:mod.silentban.never');
        return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
    }
}

