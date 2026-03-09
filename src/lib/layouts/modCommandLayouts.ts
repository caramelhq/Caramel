// modCommandLayouts.ts — All Moderation & Module command-specific UI layouts

import type { GuildConfig } from '@prisma/client';
import type { Guild } from 'discord.js';
import { Emojis } from '../constants/emojis';

// ─────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────

// Adds the required Components V2 flag to any response
function flaggedResponse(components: any[]) {
    return { flags: 32768, components };
}

// Creates a simple container with one text display, with optional accent color
function textContainer(content: string, accentColor?: number) {
    return {
        type: 17,
        ...(accentColor !== undefined && { accent_color: accentColor }),
        components: [{ type: 10, content }]
    };
}

// Creates a divider separator between sections
function divider(spacing = 2) {
    return { type: 14, spacing, divider: true };
}

// ─────────────────────────────────────────────────────────────
// Global Command Layouts
// ─────────────────────────────────────────────────────────────

// Shown when the user cancels a confirmation flow (e.g. module reset or setup)
export function getCancelledLayout(message: string) {
    return flaggedResponse([
        textContainer(message)
    ]);
}

// Shown when a button interaction expires without a response
export function getTimeoutLayout(message: string) {
    return flaggedResponse([
        textContainer(`⏱️ ${message}`)
    ]);
}

// Shown after enabling or disabling a module — shows the new state with an emoji
export function getStatusUpdateLayout(displayName: string, state: string, isEnabled: boolean) {
    const emoji = isEnabled ? Emojis.enabled_setting_emoji : Emojis.disabled_setting_emoji;
    return flaggedResponse([
        textContainer(`${emoji} ${state}`)
    ]);
}

// ─────────────────────────────────────────────────────────────
// Module Reset
// ─────────────────────────────────────────────────────────────

// Confirmation prompt shown before wiping a module's config (with Yes/No buttons)
export function getResetLayout(confirmId: string, cancelId: string, title: string, description: string, deletionsText: string, yesLabel: string, noLabel: string) {
    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `${Emojis.reset_module_emoji} **${title}**\n\n${description}\n\n${deletionsText}\n\n-# This action cannot be undone.`
                },
                divider(),
                {
                    type: 1,
                    components: [
                        { type: 2, style: 4, custom_id: confirmId, label: yesLabel },
                        { type: 2, style: 2, custom_id: cancelId,  label: noLabel }
                    ]
                }
            ]
        }
    ]);
}

// ─────────────────────────────────────────────────────────────
// Module Setup
// ─────────────────────────────────────────────────────────────

// Confirmation prompt shown before running setup — lists what will be created (with Confirm/Cancel buttons)
export function getModuleSetupConfirmLayout(confirmId: string, cancelId: string, title: string, description: string, actionsText: string, confirmLabel: string, cancelLabel: string) {
    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 10,
                    content: `## ${title}\n\n${description}\n\n${actionsText}\n\nDo you want to continue?`
                },
                divider(),
                {
                    type: 1,
                    components: [
                        { type: 2, style: 1, custom_id: confirmId, label: confirmLabel },
                        { type: 2, style: 4, custom_id: cancelId,  label: cancelLabel }
                    ]
                }
            ]
        }
    ]);
}

// Summary card shown after a module setup completes successfully
export function getModuleSetupSummaryLayout(title: string, actionsText: string, footer: string) {
    return flaggedResponse([
        textContainer(`## ${title}\n\n${actionsText}\n\n-# ${footer}`)
    ]);
}

// ─────────────────────────────────────────────────────────────
// Module Settings
// ─────────────────────────────────────────────────────────────

// Settings panel for a module — shows all config values with enable/disable badge pill
export function getModuleLayout(moduleName: string, config: GuildConfig, guild: Guild, labels: any) {
    const isEnabled = (config as any)[`${moduleName}Module`] as boolean;
    const bullet = (value: unknown) => value ? Emojis.enabled_setting_emoji : Emojis.disabled_setting_emoji;

    let details = '';

    if (moduleName === 'vanity') {
        const role = guild.roles.cache.get(config.vanityRoleId ?? '');
        details = [
            `${bullet(config.vanityString)} **${labels.keyword}**: \`${config.vanityString || labels.notSet}\``,
            `${bullet(config.vanityRoleId)} **${labels.role}**: ${config.vanityRoleId ? `<@&${config.vanityRoleId}>` : `\`${labels.notSet}\``}`,
            `${bullet(config.vanityChannelId)} **${labels.channel}**: ${config.vanityChannelId ? `<#${config.vanityChannelId}>` : `\`${labels.notSet}\``}`,
            `${Emojis.static_setting_emoji} **${labels.usersWithVanity}**: \`${role ? role.members.size : 0}\``
        ].join('\n');
    }

    if (moduleName === 'mod') {
        details = [
            `${bullet(config.modLogChannelId)} **${labels.logChannel}**: ${config.modLogChannelId ? `<#${config.modLogChannelId}>` : `\`${labels.notSet}\``}`,
            `${bullet(config.mutedRoleId)} **${labels.mutedRole}**: ${config.mutedRoleId ? `<@&${config.mutedRoleId}>` : `\`${labels.notSet}\``}`
        ].join('\n');
    }

    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 9,
                    components: [{ type: 10, content: `## ${labels.title}\n\n${details}` }],
                    accessory: {
                        type: 2,
                        style: 2,
                        label: isEnabled ? labels.enabled : labels.disabled,
                        disabled: true,
                        custom_id: `status_${moduleName}`,
                        emoji: { id: isEnabled ? Emojis.enabled_module_emoji.match(/\d+/)?.[0] : Emojis.disabled_module_emoji.match(/\d+/)?.[0] }
                    }
                }
            ]
        }
    ]);
}

// ─────────────────────────────────────────────────────────────
// Moderation — Log
// ─────────────────────────────────────────────────────────────

// Log entry card sent to the mod-log channel — uses accent color to indicate severity
export function getModLogLayout(data: {
    title: string;
    color: number;
    lines: string[];
    userId: string;
}) {
    return {
        flags: 32768,
        components: [{ type: 17, accent_color: data.color, components: [{ type: 10, content: data.lines.join('\n') }] }],
        allowedMentions: { parse: [], users: [data.userId] }
    };
}

// ─────────────────────────────────────────────────────────────
// Silent Ban
// ─────────────────────────────────────────────────────────────

// List of all active silent bans in the server — shows count badge + entries
export function getSilentBanListLayout(title: string, countLabel: string, listText: string) {
    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 9,
                    components: [{ type: 10, content: `${Emojis.static_setting_emoji} **${title}**⠀⠀⠀⠀⠀` }],
                    accessory: {
                        type: 2, style: 2, disabled: true,
                        custom_id: 'silentban_list',
                        label: countLabel
                    }
                },
                { type: 14 },
                { type: 10, content: listText }
            ]
        }
    ]);
}

// Confirmation card shown when adding or removing a user from the silent ban list
export function getSilentBanAddLayout(content: string, durationLabel: string, reason?: string | null) {
    return flaggedResponse([
        {
            type: 17,
            components: [
                {
                    type: 9,
                    components: [{ type: 10, content: `${Emojis.enabled_setting_emoji} ${content}` }],
                    accessory: {
                        type: 2, style: 2, disabled: true,
                        custom_id: 'duration',
                        label: durationLabel,
                        emoji: { id: Emojis.timeout_emoji.match(/\d+/)?.[0]! }
                    }
                },
                ...(reason ? [
                    { type: 14 },
                    { type: 10, content: `${Emojis.static_setting_emoji} **Reason**: ${reason}` }
                ] : [])
            ]
        }
    ]);
}

// ─────────────────────────────────────────────────────────────
// Lockdown
// ─────────────────────────────────────────────────────────────

// Simple text card for lockdown and unlock confirmation messages
export function getLockdownLayout(content: string) {
    return flaggedResponse([textContainer(content)]);
}

// ─────────────────────────────────────────────────────────────
// Mod DM
// ─────────────────────────────────────────────────────────────

// Red-accented card sent directly to the sanctioned user's DMs
export function getModDMLayout(data: {
    title: string;
    description: string;
    reason: string | null;
    duration?: string | null;
    footer: string;
}) {
    return {
        components: [
            {
                type: 17,
                accent_color: 0xF44336, // Red
                components: [
                    {
                        type: 9,
                        components: [{ type: 10, content: `## ${data.title}\n\n${data.description}` }],
                        accessory: {
                            type: 2, style: 2, disabled: true,
                            custom_id: 'mod_dm_info',
                            label: 'Sanction Received',
                            emoji: { id: Emojis.disabled_module_emoji.match(/\d+/)?.[0]! }
                        }
                    },
                    { type: 14 },
                    { type: 10, content: `${Emojis.static_setting_emoji} **Reason**: ${data.reason ?? 'No reason provided'}` },
                    ...(data.duration ? [
                        { type: 10, content: `${Emojis.timeout_emoji} **Duration**: ${data.duration}` }
                    ] : []),
                    { type: 14 },
                    { type: 10, content: `-# ${data.footer}` }
                ]
            }
        ]
    };
}
