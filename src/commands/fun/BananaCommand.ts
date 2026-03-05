import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';


// Constants ──────────────────

const BANANA_IMAGE_URL = 'https://em-content.zobj.net/source/google/439/banana_1f34c.png';
const MIN_CM = 0;
const MAX_CM = 30;


// Helpers ──────────────────

function randomBanana(): number {
    return Math.floor(Math.random() * (MAX_CM - MIN_CM + 1)) + MIN_CM;
}

function getResultLabel(cm: number): string {
    if (cm === 0)  return '💀 Tragic';
    if (cm <= 5)   return '😬 Rough';
    if (cm <= 10)  return '😐 Mid';
    if (cm <= 20)  return '😏 Not bad';
    if (cm <= 28)  return '😳 Impressive';
    return         '🏆 Legendary';
}


// Banana command ──────────────────

@ApplyOptions<Command.Options>({
    name: 'banana',
    description: '🍌 How long is your banana?',
})
export class BananaCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes([0, 1])
                .setContexts([0, 1, 2])
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const target = interaction.user;
        const cm = randomBanana();
        const label = getResultLabel(cm);

        await interaction.reply({
            flags: 32768,
            components: [
                {
                    type: 17,
                    // accent_color: 0xF9A825,
                    components: [
                        {
                            type: 10,
                            content: `**${target.displayName}**'s banana is **${cm}cm** long.`,
                        },
                        {
                            type: 12,
                            items: [
                                {
                                    media: { url: BANANA_IMAGE_URL },
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
                            content: [
                                `-# ${label}`,
                            ].join('\n'),
                        },
                    ],
                },
            ],
        } as any);
    }
}