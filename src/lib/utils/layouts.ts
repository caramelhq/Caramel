import type { GuildConfig } from '@prisma/client';
import type { Guild } from 'discord.js';
import { Emojis } from '../constants/emojis';


// Constants ────────────────────

const PASTEL_COLORS = [
    16110577, 13890037, 13884661, 15520757, 16110559,
    13891047, 16118739, 15775651, 10744012, 10744048, 11117552
] as const;

function randomPastel() {
    return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}


// Base message prettier layout ────────────────────

function textContainer(content: string, accentColor?: number) {
    return {
        type: 17,
        ...(accentColor !== undefined && { accent_color: accentColor }),
        components: [{ type: 10, content }]
    };
}

function divider(spacing = 2) {
    return { type: 14, spacing, divider: true };
}

function flaggedResponse(components: object[]) {
    return { flags: 32768, components } as any;
}


// Conditional layouts ────────────────────


// Operation cancelled layout ──────────

export function getCancelledLayout() {
    return flaggedResponse([
        textContainer(`${Emojis.disabled_setting_emoji} Module reset operation was cancelled.`)
    ]);
}


// Operation timed out layout ──────────

export function getTimeoutLayout() {
    return flaggedResponse([
        textContainer('⏱️ This operation has timed out.')
    ]);
}


// Module status layouts ────────────────────

// Enabled/Disabled layout ──────────

export function getStatusUpdateLayout(displayName: string, isEnabled: boolean) {
    const emoji = isEnabled ? Emojis.enabled_setting_emoji : Emojis.disabled_setting_emoji;
    const state = isEnabled ? 'enabled' : 'disabled';

    return flaggedResponse([
        textContainer(`${emoji} **${displayName}** module is now ${state}.`)
    ]);
}


// Module already enabled layout ──────────

export function getAlreadyEnabledLayout(moduleName: string) {
    return flaggedResponse([
        textContainer(`${Emojis.static_setting_emoji} **${moduleName}** module is already enabled.`)
    ]);
}


// Module reset layouts ────────────────────

// Confirmation before resetting a module layout ──────────

export function getResetLayout(confirmId: string, cancelId: string, deletions: string[]) {
    const deletionsText = deletions.map(d => {
        if (d.startsWith('delete:')) return `${Emojis.disabled_setting_emoji} ${d.slice(7)}`;
        if (d.startsWith('unlink:')) return `${Emojis.static_setting_emoji} ${d.slice(7)} *(linked manually, will be unlinked)*`;
        return `${Emojis.static_setting_emoji} ${d}`;
    }).join('\n');

    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `${Emojis.reset_module_emoji} **Factory reset this module?**\n\nThe following changes will be applied to your server:\n\n${deletionsText}\n\n-# This action cannot be undone.`
                },
                divider(),
                {
                    type: 1,
                    components: [
                        { type: 2, style: 4, custom_id: confirmId, label: '⠀⠀⠀⠀⠀⠀Yes⠀⠀⠀⠀⠀⠀' },
                        { type: 2, style: 2, custom_id: cancelId,  label: '⠀⠀⠀⠀⠀⠀No⠀⠀⠀⠀⠀⠀' }
                    ]
                }
            ]
        }
    ]);
}


// Module successfully reset layout ──────────

export function getSuccessLayout(moduleName: string) {
    return flaggedResponse([
        textContainer(`${Emojis.enabled_setting_emoji} The **${moduleName}** module has been reset to its default values.`)
    ]);
}


// Module setup layouts ────────────────────

// Module pre-do actions - ask layout ──────────

export function getModuleSetupConfirmLayout(confirmId: string, cancelId: string, data: {
    moduleName: string;
    actions: string[];
}) {
    const actionsText = data.actions.map(a => `${Emojis.static_setting_emoji} ${a}`).join('\n');

    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `## ${data.moduleName} Setup\n\nCaramel will do the following in your server:\n\n${actionsText}\n\nDo you want to continue?`
                },
                divider(),
                {
                    type: 1,
                    components: [
                        { type: 2, style: 1, custom_id: confirmId, label: '⠀⠀⠀⠀Confirm⠀⠀⠀⠀' },
                        { type: 2, style: 4, custom_id: cancelId,  label: '⠀⠀⠀⠀Cancel⠀⠀⠀⠀' }
                    ]
                }
            ]
        }
    ]);
}


// Module setup successfully completed layout ──────────

export function getModuleSetupSummaryLayout(moduleName: string, actions: string[]) {
    const actionsText = actions.map(a => `${Emojis.enabled_setting_emoji} ${a}`).join('\n');

    return flaggedResponse([
        textContainer(`## ${moduleName} Setup Complete\n\n${actionsText}\n\n-# Use </module enable:1475038787796205760> to activate this module.`)
    ]);
}


// Module settings layouts ────────────────────

// Module configuration with enable/disable badge layout ──────────

export const getModuleLayout = (moduleName: string, config: GuildConfig, guild: Guild, isSetupSuccess = false) => {
    const isEnabled = (config as any)[`${moduleName}Module`] as boolean;
    const displayName = moduleName === 'vanity' ? 'Vanity Tracker' : moduleName === 'mod' ? 'Moderation' : 'Module';

    const bullet = (value: unknown) => value ? Emojis.enabled_setting_emoji : Emojis.disabled_setting_emoji;

    let details = '';

    if (moduleName === 'vanity') {
        const role = guild.roles.cache.get(config.vanityRoleId ?? '');
        details = [
            `${bullet(config.vanityString)} **Keyword**: \`${config.vanityString || 'Not set'}\``,
            `${bullet(config.vanityRoleId)} **Role**: ${config.vanityRoleId ? `<@&${config.vanityRoleId}>` : '`Not set`'}`,
            `${bullet(config.vanityChannelId)} **Channel**: ${config.vanityChannelId ? `<#${config.vanityChannelId}>` : '`Not set`'}`,
            ...(!isSetupSuccess ? [`${Emojis.static_setting_emoji} **Users with vanity**: \`${role ? role.members.size : 0}\``] : [])
        ].join('\n');
    }

    if (moduleName === 'mod') {
        details = [
            `${bullet(config.modLogChannelId)} **Log Channel**: ${config.modLogChannelId ? `<#${config.modLogChannelId}>` : '`Not set`'}`,
            `${bullet(config.mutedRoleId)} **Muted Role**: ${config.mutedRoleId ? `<@&${config.mutedRoleId}>` : '`Not set`'}`
        ].join('\n');
    }

    const actionHint = isSetupSuccess
        ? `\n\n-# Use </module ${isEnabled ? 'disable' : 'enable'}:1475038787796205760> to ${isEnabled ? 'disable' : 'enable'} this module.`
        : '';

    const title = isSetupSuccess ? `## ${displayName} Setup` : `## ${displayName} Configuration`;

    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 9,
                    components: [{ type: 10, content: `${title}\n\n${details}${actionHint}` }],
                    accessory: {
                        type: 2,
                        style: 2,
                        label: isEnabled ? 'Enabled' : 'Disabled',
                        disabled: true,
                        custom_id: `status_${moduleName}`,
                        emoji: { id: isEnabled ? Emojis.enabled_module_emoji.match(/\d+/)?.[0] : Emojis.disabled_module_emoji.match(/\d+/)?.[0] }
                    }
                }
            ]
        }
    ]);
};


// Vanity module layouts ────────────────────

// Module welcome message layout ──────────

export function getVanityWelcomeLayout(memberId: string, roleId: string, avatarURL: string, vanityString: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                accent_color: randomPastel(),
                components: [
                    {
                        type: 9,
                        components: [{
                            type: 10,
                            content: `# Thanks for the support! ${Emojis.vanity_welcome_emoji}\nHey, <@${memberId}>! We appreciate you promoting\nour server on your profile, **${vanityString}** looks great on you.\n\n> You've received the role: <@&${roleId}>\n\n-# If you remove the vanity, you'll lose the role automatically`
                        }],
                        accessory: { type: 11, media: { url: avatarURL } }
                    }
                ]
            }
        ],
        allowed_mentions: { parse: ['users'], roles: [] }
    };
}


// Moderation module layouts ────────────────────

export type ModAction = 'warn' | 'ban' | 'kick' | 'timeout' | 'unmute';

const MOD_ACTION_CONFIG: Record<ModAction, { label: string; color: number; emoji: string }> = {
    warn:    { label: 'Warning', color: 16776960, emoji: '⚠️' },
    ban:     { label: 'Ban',     color: 15548997, emoji: '🔨' },
    kick:    { label: 'Kick',    color: 15105570, emoji: '👢' },
    timeout: { label: 'Timeout', color: 15105570, emoji: '⏱️' },
    unmute:  { label: 'Unmute',  color: 5763719,  emoji: '🔓' },
};

const MOD_DM_MESSAGES: Record<ModAction, (guildName: string) => string> = {
    warn:    (g) => `You have received a **warning** in **${g}**.`,
    ban:     (g) => `You have been **banned** from **${g}**.`,
    kick:    (g) => `You have been **kicked** from **${g}**.`,
    timeout: (g) => `You have been **timed out** in **${g}**.`,
    unmute:  (g) => `Your timeout in **${g}** has been lifted.`,
};


// Mod-log message layout ──────────

export function getModLogLayout(data: {
    action: ModAction;
    userId: string;
    userTag: string;
    moderatorId: string;
    reason?: string | null;
    duration?: string | null;
    warnCount?: number;
}) {
    const { label, color, emoji } = MOD_ACTION_CONFIG[data.action];

    const lines = [
        `${emoji} **${label}**\n`,
        `${Emojis.static_setting_emoji} **User**: <@${data.userId}> \`${data.userTag}\` \`(${data.userId})\``,
        `${Emojis.static_setting_emoji} **Moderator**: <@${data.moderatorId}>`,
        ...(data.reason    ? [`${Emojis.static_setting_emoji} **Reason**: ${data.reason}`]                              : []),
        ...(data.duration  ? [`${Emojis.static_setting_emoji} **Duration**: ${data.duration}`]                          : []),
        ...(data.warnCount !== undefined ? [`${Emojis.static_setting_emoji} **Total warnings**: \`${data.warnCount}\``] : []),
    ];

    return {
        flags: 32768,
        components: [{ type: 17, accent_color: color, components: [{ type: 10, content: lines.join('\n') }] }],
        allowedMentions: { parse: [], users: [data.userId] }
    };
}


// DM message to sanctioned user layout ──────────

export function getModDMLayout(data: {
    action: ModAction;
    guildName: string;
    reason?: string | null;
    duration?: string | null;
}) {
    const lines = [
        MOD_DM_MESSAGES[data.action](data.guildName),
        ...(data.reason   ? [`\n${Emojis.static_setting_emoji} **Reason**: ${data.reason}`]   : []),
        ...(data.duration ? [`${Emojis.static_setting_emoji} **Duration**: ${data.duration}`] : []),
        `\n-# If you believe this was a mistake, please contact the server staff.`
    ];

    return flaggedResponse([textContainer(lines.join('\n'))]);
}


// Silent-ban module layouts ────────────────────

export type SilentBanAction = 'add' | 'remove' | 'list';

// Add/Remove/List silent-bans layout ──────────

export function getSilentBanLayout(action: SilentBanAction, data?: {
    userTag?: string;
    count?: number;
    listText?: string;
    duration?: string;
    reason?: string | null;
}) {

    // Remove layout ──────────

    if (action === 'remove') {
        return flaggedResponse([
            textContainer(`${Emojis.disabled_setting_emoji} The silent ban for **${data?.userTag}** has been removed.`)
        ]);
    }

    // List layout ──────────

    if (action === 'list') {
        return flaggedResponse([
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        components: [{ type: 10, content: `${Emojis.static_setting_emoji} **SILENT BAN LIST**⠀⠀⠀⠀⠀` }],
                        accessory: {
                            type: 2, style: 2, disabled: true,
                            custom_id: 'silentban_list',
                            label: `${data?.count ?? 0} ${data?.count === 1 ? 'user' : 'users'}`
                        }
                    },
                    { type: 14 },
                    { type: 10, content: data?.listText || '*No active bans*' }
                ]
            }
        ]);
    }

    // Add layout ──────────

    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 9,
                    components: [{ type: 10, content: `${Emojis.enabled_setting_emoji} The user **${data?.userTag}** has been silent-banned.` }],
                    accessory: {
                        type: 2, style: 2, disabled: true,
                        custom_id: 'duration',
                        label: data?.duration || 'Permanent',
                        emoji: { id: Emojis.timeout_emoji.match(/\d+/)?.[0]! }
                    }
                },
                ...(data?.reason ? [
                    { type: 14 },
                    { type: 10, content: `${Emojis.static_setting_emoji} **Reason**: ${data.reason}` }
                ] : [])
            ]
        }
    ]);
}


// Lockdown module layouts ────────────────────

// Lock/Unlock channel message layout ──────────

export function getLockdownLayout(isLocked: boolean) {
    const emoji = isLocked ? Emojis.channel_locked_emoji : Emojis.channel_unlocked_emoji;
    const text  = isLocked ? 'This channel has been locked.' : 'This channel has been unlocked.';

    return flaggedResponse([textContainer(`${emoji} ${text}`)]);
}


// Mod channel layouts ────────────────────

// Module enabled but not configured layout ──────────

export function getModChannelPromptLayout(createId: string, manualId: string) {
    return flaggedResponse([
        {
            type: 17,
            components: [
                { type: 10, content: `${Emojis.static_setting_emoji} **Moderation** module requires a log channel.\nDo you want Caramel to create and configure one automatically?` },
                divider(),
                {
                    type: 1,
                    components: [
                        { type: 2, style: 1, custom_id: createId, label: '⠀⠀Create automatically⠀⠀' },
                        { type: 2, style: 2, custom_id: manualId, label: '⠀⠀Configure manually⠀⠀' }
                    ]
                }
            ]
        }
    ]);
}


// Channel auto-created message layout ──────────

export function getModChannelCreatedLayout(channelId: string) {
    return flaggedResponse([
        textContainer(`${Emojis.enabled_setting_emoji} Log channel <#${channelId}> created and configured.\n**Moderation** module is now enabled.`)
    ]);
}


// Instructions for manually configure mod-log channel layout ──────────

export function getModChannelManualLayout() {
    return flaggedResponse([
        textContainer(
            `${Emojis.disabled_setting_emoji} **No problem.** Configure the log channel manually and then enable the module:\n\n\`\`\`\n/module setup name:Moderation channel:#your-channel\n\`\`\`\n\n-# Once configured, use </module enable:1475038787796205760> to activate it.`
        )
    ]);
}