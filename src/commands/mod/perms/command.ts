import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
import modEn from '../../../lib/i18n/en-US/modcommands.json';
import modEs from '../../../lib/i18n/es-ES/modcommands.json';
import {
    executePermsAllow,
    executePermsDeny,
    executePermsDelete,
    executePermsList,
} from '../../../command-helpers/mod/perms/core/service.js';

const ACTION_CHOICES = [
    { name: 'Ban',         value: 'ban'        },
    { name: 'Kick',        value: 'kick'       },
    { name: 'Warn',        value: 'warn'       },
    { name: 'Mute',        value: 'mute'       },
    { name: 'Timeout',     value: 'timeout'    },
    { name: 'Softban',     value: 'softban'    },
    { name: 'Tempban',     value: 'tempban'    },
    { name: 'Silent Ban',  value: 'silentban'  },
    { name: 'Unban',       value: 'unban'      },
    { name: 'Unmute',      value: 'unmute'     },
    { name: 'Un-timeout',  value: 'untimeout'  },
    { name: 'Lockdown',    value: 'lockdown'   },
    { name: 'Slowmode',    value: 'slowmode'   },
    { name: 'Cases',       value: 'case'       },
    { name: 'Remove Case', value: 'removecase' },
    { name: 'Threshold',   value: 'threshold'  },
    { name: 'User Info',   value: 'user'       },
    { name: 'History',     value: 'history'    },
] as const;

@ApplyOptions<Subcommand.Options>({
    name: 'permission',
    description: modEn.command.perms.description,
    preconditions: ['GuildOnly'],
    subcommands: [
        { name: 'allow',  chatInputRun: 'chatInputAllow'  },
        { name: 'deny',   chatInputRun: 'chatInputDeny'   },
        { name: 'delete', chatInputRun: 'chatInputDelete' },
        { name: 'list',   chatInputRun: 'chatInputList'   },
    ],
})
export class PermsCommand extends Subcommand {
    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.description })
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                // allow ──────────
                .addSubcommand((sub) =>
                    sub
                        .setName('allow')
                        .setDescription(modEn.command.perms.subcommands.allow)
                        .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.subcommands.allow })
                        .addStringOption((o) =>
                            o.setName('action')
                                .setDescription(modEn.command.perms.options.action)
                                .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.action })
                                .setRequired(true)
                                .addChoices(...ACTION_CHOICES)
                        )
                        .addRoleOption((o) => o.setName('role').setDescription(modEn.command.perms.options.role).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.role }))
                        .addUserOption((o) => o.setName('member').setDescription(modEn.command.perms.options.member).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.member }))
                )
                // deny ──────────
                .addSubcommand((sub) =>
                    sub
                        .setName('deny')
                        .setDescription(modEn.command.perms.subcommands.deny)
                        .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.subcommands.deny })
                        .addStringOption((o) =>
                            o.setName('action')
                                .setDescription(modEn.command.perms.options.action)
                                .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.action })
                                .setRequired(true)
                                .addChoices(...ACTION_CHOICES)
                        )
                        .addRoleOption((o) => o.setName('role').setDescription(modEn.command.perms.options.role).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.role }))
                        .addUserOption((o) => o.setName('member').setDescription(modEn.command.perms.options.member).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.member }))
                )
                // delete ──────────
                .addSubcommand((sub) =>
                    sub
                        .setName('delete')
                        .setDescription(modEn.command.perms.subcommands.delete)
                        .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.subcommands.delete })
                        .addStringOption((o) =>
                            o.setName('action')
                                .setDescription(modEn.command.perms.options.action)
                                .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.action })
                                .setRequired(true)
                                .addChoices(...ACTION_CHOICES)
                        )
                        .addRoleOption((o) => o.setName('role').setDescription(modEn.command.perms.options.role).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.role }))
                        .addUserOption((o) => o.setName('member').setDescription(modEn.command.perms.options.member).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.member }))
                )
                // list ──────────
                .addSubcommand((sub) =>
                    sub
                        .setName('list')
                        .setDescription(modEn.command.perms.subcommands.list)
                        .setDescriptionLocalizations({ 'es-ES': modEs.command.perms.subcommands.list })
                        .addRoleOption((o) => o.setName('role').setDescription(modEn.command.perms.options.role).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.role }))
                        .addUserOption((o) => o.setName('member').setDescription(modEn.command.perms.options.member).setDescriptionLocalizations({ 'es-ES': modEs.command.perms.options.member }))
                )
        );
    }

    public async chatInputAllow(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: 64 });
        const role   = interaction.options.getRole('role');
        const member = interaction.options.getMember('member') as GuildMember | null;
        const action = interaction.options.getString('action', true);
        return executePermsAllow({ interaction, guildId: interaction.guildId!, role, member, action });
    }

    public async chatInputDeny(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: 64 });
        const role   = interaction.options.getRole('role');
        const member = interaction.options.getMember('member') as GuildMember | null;
        const action = interaction.options.getString('action', true);
        return executePermsDeny({ interaction, guildId: interaction.guildId!, role, member, action });
    }

    public async chatInputDelete(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: 64 });
        const role   = interaction.options.getRole('role');
        const member = interaction.options.getMember('member') as GuildMember | null;
        const action = interaction.options.getString('action', true);
        return executePermsDelete({ interaction, guildId: interaction.guildId!, role, member, action });
    }

    public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: 64 });
        const role   = interaction.options.getRole('role');
        const member = interaction.options.getMember('member') as GuildMember | null;
        return executePermsList({ interaction, guildId: interaction.guildId!, role, member });
    }
}
