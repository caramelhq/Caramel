import { Emojis } from '../constants/emojis';

export interface UserInfoLabels {
    joinedDiscord: string;
    joinedServer: string;
    highestRole: string;
    viewHistoryBtn: string;
    addNoteBtn: string;
}

export function getUserInfoLayout(
    targetId: string,
    targetUsername: string,
    avatarUrl: string,
    joinedDiscordStr: string,
    joinedServerStr: string,
    highestRoleIdStr: string, // Formatted ping <@&id> or string indicator
    accentColor: number,
    invokerId: string,
    labels: UserInfoLabels
) {
    return {
        flags: 32768, // Components V2 flag
        components: [
            {
                type: 17, // Container
                accent_color: accentColor,
                components: [
                    {
                        type: 9, // Header with Accessory
                        components: [
                            {
                                type: 10,
                                content: `### <@${targetId}> (${targetUsername})\n\n**ID**: \`${targetId}\`\n\n**${labels.highestRole}**\n${highestRoleIdStr}\n\n**${labels.joinedDiscord}**:\n${joinedDiscordStr}\n\n**${labels.joinedServer}**:\n${joinedServerStr}`
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: {
                                url: avatarUrl
                            }
                        }
                    },
                    {
                        type: 14 // Separator
                    },
                    {
                        type: 1, // ActionRow
                        components: [
                            {
                                type: 2, // Button
                                style: 2, // Secondary
                                custom_id: `mod_history_${targetId}_${invokerId}`,
                                label: labels.viewHistoryBtn,
                                disabled: false,
                                emoji: {
                                    id: Emojis.view_history_emoji.match(/\d+/)?.[0]!
                                }
                            },
                            {
                                type: 2, // Button
                                style: 2, // Secondary
                                custom_id: `mod_addnote_${targetId}_${invokerId}`,
                                label: labels.addNoteBtn,
                                disabled: true,
                                emoji: {
                                    id: Emojis.add_note_emoji.match(/\d+/)?.[0]!
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

export function getHistoryLayout(
    title: string,
    historyText: string
) {
    return {
        flags: 32768, // Components V2 flag
        components: [
            {
                type: 17, // Container
                components: [
                    {
                        type: 10, // TextDisplay
                        content: `${Emojis.static_setting_emoji} **${title}**`,
                    },
                    {
                        type: 14, // Separator
                        divider: true,
                        spacing: 1,
                    },
                    {
                        type: 10, // TextDisplay
                        content: historyText
                    }
                ],
            },
        ],
    };
}

