import { Command, Args } from '@sapphire/framework';
import { resolveKey } from '@sapphire/plugin-i18next';
import { PermissionFlagsBits, Message } from 'discord.js';
import { prisma } from '../../database/db';
import { CacheManager } from '../../database/CacheManager';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';

export class LanguageCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'language',
            aliases: ['lang'],
            description: 'Change the bot language for this server.',
            preconditions: ['GuildOnly'],
            runIn: ['GUILD_ANY']
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
                        .setName('language')
                        .setDescription('Select the new language')
                        .setRequired(true)
                        .addChoices(
                            { name: 'English', value: 'en-US' },
                            { name: 'Español', value: 'es-ES' }
                        )
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });

        const guildId = interaction.guildId!;
        const newLocale = interaction.options.getString('language', true);

        return this.updateLanguage(interaction, guildId, newLocale);
    }

    public override async messageRun(message: Message, args: Args) {
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

        const newLocale = await args.pick('string').catch(() => null);
        if (!newLocale || !['en-US', 'es-ES', 'en', 'es'].includes(newLocale)) {
            return message.reply({ ...getMessageLayout(await resolveKey(message, 'modules:config.language.invalid')) });
        }

        const normalizedLocale = (newLocale === 'es' || newLocale === 'es-ES') ? 'es-ES' : 'en-US';
        return this.updateLanguage(message, message.guildId!, normalizedLocale);
    }

    private async updateLanguage(target: Command.ChatInputCommandInteraction | Message, guildId: string, newLocale: string) {
        try {
            const updated = await prisma.guildConfig.upsert({
                where: { guildId },
                update: { locale: newLocale },
                create: { guildId, locale: newLocale }
            });

            await CacheManager.syncGuild(guildId, updated);

            const langDisplay = newLocale === 'es-ES' ? 'Español' : 'English';
            const successMessage = await resolveKey(target, 'modules:config.language.success', { lang: langDisplay });

            if (target instanceof Message) {
                return target.reply(getMessageLayout(successMessage));
            } else {
                return target.editReply(getMessageLayout(successMessage));
            }
        } catch (error) {
            this.container.logger.error(`[CONFIG LANGUAGE] Failed to update locale for ${guildId}:`, error);
            const errContent = { content: await resolveKey(target, 'errors:unexpected') };
            if (target instanceof Message) return target.reply(errContent);
            return target.editReply(errContent);
        }
    }
}
