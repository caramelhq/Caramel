import { Subcommand } from '@sapphire/plugin-subcommands';
import { PermissionFlagsBits, ComponentType, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, Guild, ModalSubmitInteraction } from 'discord.js';
import { GuildConfig } from '../../database/models/GuildConfig';
import { ModuleValidators } from '../../validators/ModuleValidator';
import { CacheManager } from '../../database/CacheManager';
import { getModuleLayout, getResetLayout, getSuccessLayout, getCancelledLayout, getStatusUpdateLayout, getTimeoutLayout, getModuleSetupConfirmLayout, getModuleSetupSummaryLayout, getAlreadyEnabledLayout } from '../../lib/utils/layouts';
import { Emojis } from '../../lib/constants/emojis';


// Constants ──────────────────

// Maps a module value to its display name ──────────

const MODULE_DISPLAY_NAMES: Record<string, string> = {
    vanity: 'Vanity Tracker',
    mod:    'Moderation',
};

function getDisplayName(moduleValue: string) {
    return MODULE_DISPLAY_NAMES[moduleValue] ?? 'Module';
}


// Reset payloads per module ──────────

const RESET_MAP: Record<string, (guildId: string, client: any) => Promise<void>> = {
    vanity: async (guildId, client) => {
        const config = await GuildConfig.findByPk(guildId);
        if (!config) return;

        if (config.vanityChannelId && config.vanityChannelCreatedByBot) {
            const channel = await client.channels.fetch(config.vanityChannelId).catch(() => null);
            if (channel?.isTextBased()) {
                const webhooks = await channel.fetchWebhooks().catch(() => null);
                const caramelWh = webhooks?.find((wh: any) => wh.name === 'Caramel');
                await caramelWh?.delete('Module reset').catch(() => {});
            }
            await channel?.delete('Caramel - Vanity module reset').catch(() => {});
        }

        if (config.vanityRoleId && config.vanityRoleCreatedByBot) {
            const guild = client.guilds.cache.get(guildId);
            const role = await guild?.roles.fetch(config.vanityRoleId).catch(() => null);
            await role?.delete('Caramel - Vanity module reset').catch(() => {});
        }

        await config.update({
            vanityString: null, vanityRoleId: null, vanityChannelId: null,
            vanityModule: false, vanityRoleCreatedByBot: false, vanityChannelCreatedByBot: false
        });
        await CacheManager.syncGuild(guildId, config);
    },
    mod: async (guildId, client) => {
        const config = await GuildConfig.findByPk(guildId);
        if (!config) return;

        if (config.modLogChannelId && config.modChannelCreatedByBot) {
            const channel = await client.channels.fetch(config.modLogChannelId).catch(() => null);
            await channel?.delete('Caramel - Mod module reset').catch(() => {});
        }

        if (config.mutedRoleId && config.modRoleCreatedByBot) {
            const guild = client.guilds.cache.get(guildId);
            const role = await guild?.roles.fetch(config.mutedRoleId).catch(() => null);
            await role?.delete('Caramel - Mod module reset').catch(() => {});
        }

        await config.update({
            modLogChannelId: null, modModule: false, modThresholdsEnabled: false,
            muteThreshold: 3, banThreshold: 5, mutedRoleId: null,
            modChannelCreatedByBot: false, modRoleCreatedByBot: false
        });
        await CacheManager.syncGuild(guildId, config);
    }
};


// Helpers ──────────────────

// Role helper: resolves a role from an ID / name-input ──────────

async function resolveRole(
    input: string,
    guild: Guild,
    fallbackName: string
): Promise<{ resolvedId: string | null; action: string; error?: string }> {
    if (!input) {
        return { resolvedId: null, action: `Create role: **${fallbackName}**` };
    }

    const isId = /^\d{17,20}$/.test(input);
    if (isId) {
        const existing = await guild.roles.fetch(input).catch(() => null);
        if (!existing) return { resolvedId: null, action: '', error: '`❌` The role ID provided does not exist.' };
        return { resolvedId: existing.id, action: `Use existing role: ${existing.name}` };
    }

    return { resolvedId: null, action: `Create role: **${input}**` };
}


// Channel helper: resolves a channel from an ID / name-input ──────────

async function resolveChannel(
    input: string,
    guild: Guild,
    fallbackName: string
): Promise<{ resolvedId: string | null; action: string; error?: string }> {
    if (!input) {
        return { resolvedId: null, action: `Create channel: **#${fallbackName}**` };
    }

    const isId = /^\d{17,20}$/.test(input);
    if (isId) {
        const existing = await guild.channels.fetch(input).catch(() => null);
        if (!existing) return { resolvedId: null, action: '', error: '`❌` The channel ID provided does not exist.' };
        return { resolvedId: existing.id, action: `Use existing channel: <#${existing.id}>` };
    }

    return { resolvedId: null, action: `Create channel: **#${input}**` };
}


// Creates a private text channel in the guild ──────────

async function createPrivateChannel(guild: Guild, name: string) {
    return guild.channels.create({
        name,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
    });
}


// Builds the list of server resources that will be deleted on reset ──────────

async function getResetDeletions(moduleName: string, guildId: string, client: any): Promise<string[]> {
    const config = await GuildConfig.findByPk(guildId);
    if (!config) return [];

    const deletions: string[] = [];

    if (moduleName === 'vanity') {
        if (config.vanityChannelId) {
            if (config.vanityChannelCreatedByBot) {
                deletions.push(`delete:Channel <#${config.vanityChannelId}>`);
            } else {
                deletions.push(`unlink:Channel <#${config.vanityChannelId}>`);
            }
        }
        if (config.vanityRoleId) {
            if (config.vanityRoleCreatedByBot) {
                deletions.push(`delete:Role <@&${config.vanityRoleId}>`);
            } else {
                deletions.push(`unlink:Role <@&${config.vanityRoleId}>`);
            }
        }
    }

    if (moduleName === 'mod') {
        if (config.modLogChannelId) {
            if (config.modChannelCreatedByBot) {
                deletions.push(`delete:Channel <#${config.modLogChannelId}>`);
            } else {
                deletions.push(`unlink:Channel <#${config.modLogChannelId}>`);
            }
        }
        if (config.mutedRoleId) {
            if (config.modRoleCreatedByBot) {
                deletions.push(`delete:Role <@&${config.mutedRoleId}>`);
            } else {
                deletions.push(`unlink:Role <@&${config.mutedRoleId}>`);
            }
        }
    }

    if (deletions.length === 0) deletions.push('unlink:Configuration data only');

    return deletions;
}


// Generic setup flow with confirmation + summary ──────────

async function runSetupFlow(
    modalSubmit: ModalSubmitInteraction,
    moduleName: string,
    previewActions: string[],
    run: (config: GuildConfig, summaryActions: string[]) => Promise<void>
) {
    const { guildId } = modalSubmit;
    const confirmId = `${moduleName}_confirm_${modalSubmit.id}`;
    const cancelId  = `${moduleName}_cancel_${modalSubmit.id}`;

    const response = await modalSubmit.editReply({
        ...getModuleSetupConfirmLayout(confirmId, cancelId, {
            moduleName: getDisplayName(moduleName),
            actions: previewActions
        })
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
        filter: (i) => i.user.id === modalSubmit.user.id
    });

    collector.on('collect', async (i) => {
        if (i.customId === cancelId) {
            return i.update({ ...getCancelledLayout() }).then(() => collector.stop('cancelled'));
        }

        if (i.customId === confirmId) {
            try {
                const [config] = await GuildConfig.findOrCreate({ where: { guildId: guildId! } });
                const summaryActions: string[] = [];

                await run(config, summaryActions);

                await config.save();
                await CacheManager.syncGuild(guildId!, config);

                return i.update({ ...getModuleSetupSummaryLayout(getDisplayName(moduleName), summaryActions) })
                    .then(() => collector.stop('success'));
            } catch (error) {
                return i.update({ content: '`🔴` An error occurred during setup.' });
            }
        }
    });

    // Timeout if no interaction within the time limit ──────────

    collector.on('end', async (_, reason) => {
        if (reason !== 'success' && reason !== 'cancelled') {
            await response.edit({ ...getTimeoutLayout() });
        }
    });
}


// Module command ──────────────────

export class ModuleCommand extends Subcommand {
    public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
        super(context, {
            ...options,
            name: 'module',
            description: 'Manage CaramelLabs system modules',
            preconditions: ['GuildOnly'],
            subcommands: [
                { name: 'setup',    chatInputRun: 'chatInputSetup'    },
                { name: 'settings', chatInputRun: 'chatInputSettings' },
                { name: 'enable',   chatInputRun: 'chatInputEnable'   },
                { name: 'disable',  chatInputRun: 'chatInputDisable'  },
                { name: 'reset',    chatInputRun: 'chatInputReset'    }
            ]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        const moduleChoices = [
            { name: 'Vanity Tracker', value: 'vanity' },
            { name: 'Moderation',     value: 'mod'    }
        ] as const;

        const withModuleOption = (sub: any, description: string) =>
            sub.addStringOption((opt: any) =>
                opt.setName('name').setDescription(description).setRequired(true).addChoices(...moduleChoices)
            );

        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand((sub) => withModuleOption(sub.setName('setup').setDescription('Configure a specific module'), 'The name of the module'))
                .addSubcommand((sub) => withModuleOption(sub.setName('settings').setDescription('Show detailed configuration'), 'Module name'))
                .addSubcommand((sub) => withModuleOption(sub.setName('enable').setDescription('Enable a module'), 'Module name'))
                .addSubcommand((sub) => withModuleOption(sub.setName('disable').setDescription('Disable a module'), 'Module name'))
                .addSubcommand((sub) => withModuleOption(sub.setName('reset').setDescription('Factory reset a module'), 'Module name'))
        );
    }


    // Setup ──────────

    public async chatInputSetup(interaction: Subcommand.ChatInputCommandInteraction) {
        const moduleValue = interaction.options.getString('name', true);

        if (moduleValue === 'vanity') return this.handleVanitySetup(interaction);
        if (moduleValue === 'mod')    return this.handleModSetup(interaction);

        await interaction.reply({ content: '`❌` Setup for this module is not implemented yet.', ephemeral: false });
    }


    // Vanity setup: shows modal and runs setup flow ──────────

    private async handleVanitySetup(interaction: Subcommand.ChatInputCommandInteraction) {
        const modal = new ModalBuilder()
            .setCustomId(`vanity_setup_${interaction.id}`)
            .setTitle('Vanity Tracker Setup')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('keyword').setLabel('Status keyword (required)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('e.g. discord.gg/meetspace').setMaxLength(100)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('role').setLabel('Role ID or name (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Vanity role | Leave empty to auto-create')
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('channel').setLabel('Channel ID or name (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Log channel | Leave empty to auto-create')
                )
            );

        await interaction.showModal(modal);

        const modalSubmit = await interaction.awaitModalSubmit({
            time: 120000,
            filter: (i) => i.customId === `vanity_setup_${interaction.id}`
        }).catch(() => null);

        if (!modalSubmit) return;

        await modalSubmit.deferReply({ ephemeral: false });

        const { guild }    = modalSubmit;
        const keyword      = modalSubmit.fields.getTextInputValue('keyword');
        const roleRaw      = modalSubmit.fields.getTextInputValue('role').trim();
        const channelRaw   = modalSubmit.fields.getTextInputValue('channel').trim();

        const roleResult    = await resolveRole(roleRaw, guild!, `Vanity Role [${guild!.name}]`);
        if (roleResult.error) return modalSubmit.editReply({ content: roleResult.error });

        const channelResult = await resolveChannel(channelRaw, guild!, 'vanity-logs');
        if (channelResult.error) return modalSubmit.editReply({ content: channelResult.error });

        await runSetupFlow(
            modalSubmit,
            'vanity',
            [`Set keyword: \`${keyword}\``, roleResult.action, channelResult.action],
            async (config, summaryActions) => {
                config.vanityString = keyword;
                summaryActions.push(`Keyword set to \`${keyword}\``);

                if (roleResult.resolvedId) {
                    config.vanityRoleId = roleResult.resolvedId; config.vanityRoleCreatedByBot = false;
                    summaryActions.push(`Role linked: <@&${roleResult.resolvedId}>`);
                } else {
                    const newRole = await guild!.roles.create({ name: roleRaw || `Vanity Role [${guild!.name}]` });
                    config.vanityRoleId = newRole.id; config.vanityRoleCreatedByBot = true;
                    summaryActions.push(`Role created: <@&${newRole.id}>`);
                }

                if (channelResult.resolvedId) {
                    config.vanityChannelId = channelResult.resolvedId; config.vanityChannelCreatedByBot = false;
                    summaryActions.push(`Channel linked: <#${channelResult.resolvedId}>`);
                } else {
                    const newChannel = await createPrivateChannel(guild!, channelRaw || 'vanity-logs');
                    config.vanityChannelId = newChannel.id; config.vanityChannelCreatedByBot = true;
                    summaryActions.push(`Channel created: <#${newChannel.id}>`);
                }
            }
        );
    }


    // Mod setup: shows modal and runs setup flow ──────────

    private async handleModSetup(interaction: Subcommand.ChatInputCommandInteraction) {
        const modal = new ModalBuilder()
            .setCustomId(`mod_setup_${interaction.id}`)
            .setTitle('Moderation Setup')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('log_channel').setLabel('Log channel ID or name (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Leave empty to auto-create #mod-logs')
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder().setCustomId('muted_role').setLabel('Muted role ID or name (optional)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Leave empty to auto-create a muted role')
                )
            );

        await interaction.showModal(modal);

        const modalSubmit = await interaction.awaitModalSubmit({
            time: 120000,
            filter: (i) => i.customId === `mod_setup_${interaction.id}`
        }).catch(() => null);

        if (!modalSubmit) return;

        await modalSubmit.deferReply({ ephemeral: false });

        const { guild }    = modalSubmit;
        const channelRaw   = modalSubmit.fields.getTextInputValue('log_channel').trim();
        const mutedRoleRaw = modalSubmit.fields.getTextInputValue('muted_role').trim();

        const channelResult = await resolveChannel(channelRaw, guild!, 'mod-logs');
        if (channelResult.error) return modalSubmit.editReply({ content: channelResult.error });

        const roleResult = await resolveRole(mutedRoleRaw, guild!, 'Muted');
        if (roleResult.error) return modalSubmit.editReply({ content: roleResult.error });

        await runSetupFlow(
            modalSubmit,
            'mod',
            [channelResult.action, roleResult.action],
            async (config, summaryActions) => {
                if (channelResult.resolvedId) {
                    config.modLogChannelId = channelResult.resolvedId; config.modChannelCreatedByBot = false;
                    summaryActions.push(`Channel linked: <#${channelResult.resolvedId}>`);
                } else {
                    const newChannel = await createPrivateChannel(guild!, channelRaw || 'mod-logs');
                    config.modLogChannelId = newChannel.id; config.modChannelCreatedByBot = true;
                    summaryActions.push(`Channel created: <#${newChannel.id}>`);
                }

                if (roleResult.resolvedId) {
                    config.mutedRoleId = roleResult.resolvedId; config.modRoleCreatedByBot = false;
                    summaryActions.push(`Role linked: <@&${roleResult.resolvedId}>`);
                } else {
                    const newRole = await guild!.roles.create({
                        name:   mutedRoleRaw || 'Muted',
                        color:  0x818386,
                        reason: 'Caramel - Muted role auto-created'
                    });
                    config.mutedRoleId = newRole.id; config.modRoleCreatedByBot = true;
                    summaryActions.push(`Role created: <@&${newRole.id}>`);
                }
            }
        );
    }


    // Settings ──────────

    public async chatInputSettings(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, guild } = interaction;
        const moduleValue = options.getString('name', true);

        await interaction.deferReply({ ephemeral: false });

        try {
            const config = await GuildConfig.findByPk(guildId!);
            if (!config) return interaction.editReply({ content: '`❌` No configuration found.' });

            return interaction.editReply(getModuleLayout(moduleValue, config, guild!, false));
        } catch (error) {
            this.container.logger.error(`[MODULE SETTINGS ERROR] Guild: ${guildId}`, error);
            return interaction.editReply({ content: '`🔴` An error occurred while fetching settings.' });
        }
    }


    // Enable ──────────

    public async chatInputEnable(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, guild } = interaction;
        const moduleValue  = options.getString('name', true);
        const displayName  = getDisplayName(moduleValue);

        await interaction.deferReply({ ephemeral: false });

        try {
            const config    = await GuildConfig.findByPk(guildId!);
            const validator = ModuleValidators[moduleValue];

            if (!validator) return interaction.editReply({ content: `\`❌\` Module **${displayName}** not supported.` });
            if ((config as any)?.[`${moduleValue}Module`] === true) return interaction.editReply({ ...getAlreadyEnabledLayout(displayName) });

            const { isValid, missing } = await validator(config, guild);

            if (!isValid) {
                return interaction.editReply({
                    content: `\`❌\` **${displayName}** module cannot be enabled:\n${missing?.map(m => `${Emojis.static_setting_emoji} ${m}`).join('\n') ?? 'Run `/module setup` first.'}`
                });
            }

            await config!.update({ [`${moduleValue}Module`]: true });
            await CacheManager.syncGuild(guildId!, config!);

            return interaction.editReply(getStatusUpdateLayout(displayName, true));
        } catch (error) {
            this.container.logger.error(`[ENABLE ERROR]`, error);
            return interaction.editReply({ content: '`🔴` Error enabling module.' });
        }
    }


    // Disable ──────────

    public async chatInputDisable(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options } = interaction;
        const moduleValue = options.getString('name', true);
        const displayName = getDisplayName(moduleValue);

        await interaction.deferReply({ ephemeral: false });

        try {
            const config = await GuildConfig.findByPk(guildId!);
            if (!config) return interaction.editReply({ content: '`❌` No configuration found.' });

            await config.update({ [`${moduleValue}Module`]: false });
            await CacheManager.syncGuild(guildId!, config);

            return interaction.editReply(getStatusUpdateLayout(displayName, false));
        } catch (error) {
            this.container.logger.error(`[DISABLE ERROR]`, error);
            return interaction.editReply({ content: '`🔴` Error disabling module.' });
        }
    }


    // Reset ──────────

    public async chatInputReset(interaction: Subcommand.ChatInputCommandInteraction) {
        const { guildId, options, user } = interaction;
        const moduleName = options.getString('name', true);
        const confirmId  = `confirm_${interaction.id}`;
        const cancelId   = `cancel_${interaction.id}`;

        const deletions = await getResetDeletions(moduleName, guildId!, this.container.client);

        await interaction.reply({ ...getResetLayout(confirmId, cancelId, deletions), ephemeral: false });

        const response  = await interaction.fetchReply();
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 20000,
            filter: (i) => i.user.id === user.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === confirmId) {
                try {
                    await RESET_MAP[moduleName]?.(guildId!, this.container.client);
                    return i.update({ ...getSuccessLayout(moduleName) }).then(() => collector.stop('success'));
                } catch (error) {
                    return i.reply({ content: '`🔴` Error resetting.', ephemeral: false });
                }
            }
            if (i.customId === cancelId) return i.update({ ...getCancelledLayout() }).then(() => collector.stop('cancelled'));
        });

        // Timeout if no interaction within the time limit ──────────

        collector.on('end', async (_, reason) => {
            if (reason !== 'success' && reason !== 'cancelled') {
                await response.edit({ ...getTimeoutLayout() });
            }
        });
    }
}