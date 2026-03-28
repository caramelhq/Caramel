import { Emojis } from '../constants/emojis';
import { ContainerComponent, TextDisplayComponent, SectionComponent, SeparatorComponent, ActionRowComponent, ButtonComponent, ThumbnailComponent } from './ui';

export interface UserInfoLabels {
    joinedDiscord: string;
    joinedServer: string;
    highestRole: string;
    viewHistoryBtn: string;
    addNoteBtn: string;
    badges: string;
    clan: string;
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
    labels: UserInfoLabels,
    badgesStr: string = '',
    clanTag: string = ''
) {
    const clanLine   = clanTag.length > 0   ? `\n\n**${labels.clan}**: \`${clanTag}\`` : '';
    const badgesLine = badgesStr.length > 0 ? `\n\n**${labels.badges}**\n${badgesStr}` : '';

    return {
        flags: 32768, // Components V2 flag
        components: [
            ContainerComponent([
                SectionComponent(
                    [
                        TextDisplayComponent(`### <@${targetId}> (${targetUsername})\n\n**ID**: \`${targetId}\`${clanLine}\n\n**${labels.highestRole}**\n${highestRoleIdStr}\n\n**${labels.joinedDiscord}**:\n${joinedDiscordStr}\n\n**${labels.joinedServer}**:\n${joinedServerStr}${badgesLine}`)
                    ],
                    ThumbnailComponent(avatarUrl)
                ),
                SeparatorComponent(1, true),
                ActionRowComponent([
                    ButtonComponent(
                        `mod_history_${targetId}_${invokerId}`,
                        labels.viewHistoryBtn,
                        2,
                        { id: Emojis.list_emoji.match(/\d+/)?.[0]! }
                    ),
                    ButtonComponent(
                        `mod_addnote_${targetId}_${invokerId}`,
                        labels.addNoteBtn,
                        2,
                        { id: Emojis.add_note_emoji.match(/\d+/)?.[0]! },
                        true
                    )
                ])
            ], accentColor)
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
            ContainerComponent([
                SectionComponent([
                    TextDisplayComponent(`${Emojis.static_setting_emoji} **${title}**`)
                ]),
                SeparatorComponent(1, true),
                TextDisplayComponent(historyText)
            ])
        ]
    };
}

