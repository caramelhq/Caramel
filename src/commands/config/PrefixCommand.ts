import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../database/db';
import { CacheManager } from '../../database/CacheManager';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../lib/constants/emojis';


// Prefix command ──────────────────

export class PrefixCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'prefix',
            description: 'Change the bot prefix for this server',
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addStringOption((option) =>
                    option
                        .setName('new_prefix')
                        .setDescription('The new prefix (max 5 chars, no spaces)')
                        .setRequired(true)
                        .setMaxLength(5)
                )
        );
    }


    // Run ──────────

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guildId } = interaction;
        const newPrefix = interaction.options.getString('new_prefix', true).trim();

        // Validation ──────────

        if (newPrefix.includes(' ') || newPrefix.length === 0 || newPrefix.length > 5) {
            const errorMsg = await resolveKey(interaction, 'modules:config.prefix.invalid');
            return interaction.reply({ ...getMessageLayout(`${Emojis.cross_emoji} ${errorMsg}`), ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: false });

        // Update Database ──────────

        const config = await prisma.guildConfig.upsert({
            where: { guildId: guildId! },
            create: { guildId: guildId!, prefix: newPrefix },
            update: { prefix: newPrefix }
        });

        // Update Cache ──────────

        await CacheManager.syncGuild(guildId!, config);

        const successMsg = await resolveKey(interaction, 'modules:config.prefix.success', { prefix: newPrefix });
        return interaction.editReply({ ...getMessageLayout(`${Emojis.check_emoji} ${successMsg}`) });
    }
}
