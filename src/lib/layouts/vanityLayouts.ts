import { Emojis } from '../constants/emojis';

// Constants ────────────────────

const PASTEL_COLORS = [
    16110577, 13890037, 13884661, 15520757, 16110559,
    13891047, 16118739, 15775651, 10744012, 10744048, 11117552
] as const;

function randomPastel() {
    return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

/**
 * Layout for the vanity role welcome message
 */
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

