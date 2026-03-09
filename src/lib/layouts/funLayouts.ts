// Fun Layouts ────────────────────

/**
 * Layout for the /banana command
 */
export function getBananaLayout(userDisplayName: string, cm: number, label: string, imageURL: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                // accent_color: 0xF9A825, // Banana Yellow
                components: [
                    {
                        type: 10,
                        content: `**${userDisplayName}**'s banana is **${cm}cm** long.`,
                    },
                    {
                        type: 12,
                        items: [
                            {
                                media: { url: imageURL },
                            },
                        ],
                    },
                    {
                        type: 14,
                        divider: false,
                        spacing: 1,
                    },
                    {
                        type: 10,
                        content: `-# ${label}`,
                    },
                ],
            },
        ],
    };
}

/**
 * Layout for the /roll command
 */
export function getRollLayout(content: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                // accent_color: 0x5C6BC0, // Indigo
                components: [
                    {
                        type: 10,
                        content: content
                    }
                ]
            }
        ]
    };
}

