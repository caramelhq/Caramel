import { Subcommand } from '@sapphire/plugin-subcommands';
import { PermissionFlagsBits } from 'discord.js';
import adminCommandsEnUs from '../../lib/i18n/en-US/admincommands.json';
import adminCommandsEsEs from '../../lib/i18n/es-ES/admincommands.json';
import { HealthCommand } from '../../command-helpers/admin/health/HealthCommand';

const adminCommandLocales = {
    en: adminCommandsEnUs.command,
    es: adminCommandsEsEs.command
};

export class AdminCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: 'admin',
            description: adminCommandLocales.en.description,
            preconditions: ['GuildOnly'],
            subcommands: [
                {
                    name: 'health',
                    chatInputRun: 'chatInputHealth'
                }
            ]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': adminCommandLocales.es.description })
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((sub) =>
                    sub
                        .setName('health')
                        .setDescription(adminCommandLocales.en.subcommands.health)
                        .setDescriptionLocalizations({ 'es-ES': adminCommandLocales.es.subcommands.health })
                )
        );
    }

    public async chatInputHealth(interaction: Subcommand.ChatInputCommandInteraction) {
        return HealthCommand.run(interaction);
    }
}

