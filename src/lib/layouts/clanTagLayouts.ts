import { Emojis } from '../constants/emojis';
import { ContainerComponent, SectionComponent, TextDisplayComponent, ThumbnailComponent } from './ui';

/**
 * Layout for the clan tag role welcome message
 */
export function getClanTagWelcomeLayout(memberId: string, roleId: string, avatarURL: string, clanTag: string) {
    return {
        flags: 32768,
        components: [
            ContainerComponent([
                SectionComponent(
                    [TextDisplayComponent(`# Thanks for repping the clan! ${Emojis.vanity_welcome_emoji}\nHey, <@${memberId}>! We see you're wearing the **[${clanTag}]** tag —\nthat means a lot to us.\n\n> You've received the role: <@&${roleId}>\n\n-# If you remove the clan tag, you'll lose the role automatically`)],
                    ThumbnailComponent(avatarURL)
                )
            ])
        ],
        allowed_mentions: { parse: ['users'], roles: [] }
    };
}
