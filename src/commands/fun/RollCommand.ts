import { Command, Args } from '@sapphire/framework';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getRollLayout } from '../../lib/layouts/funLayouts';
import { Emojis } from '../../lib/constants/emojis';
import type { Message } from 'discord.js';

export class RollCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'roll',
            aliases: ['dice'],
            description: 'Roll a dice!'
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setIntegrationTypes([0, 1])
                .setContexts([0, 1, 2])
                .addIntegerOption((option) =>
                    option
                        .setName('max')
                        .setDescription('Maximum number (default: 6)')
                        .setMinValue(2)
                        .setMaxValue(1000000)
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const max = interaction.options.getInteger('max') ?? 6;
        const result = Math.floor(Math.random() * max) + 1;

        const response = await resolveKey(interaction, 'funcommands:roll.response', {
            user: interaction.user.displayName,
            result,
            max
        });

        return interaction.reply(getRollLayout(`${Emojis.roll_the_dice_emoji} ${response}`));
    }

    public override async messageRun(message: Message, args: Args) {
        const max = await args.pick('integer').catch(() => 6);
        const result = Math.floor(Math.random() * max) + 1;

        const response = await resolveKey(message, 'funcommands:roll.response', {
            user: message.author.displayName,
            result,
            max
        });

        return message.reply(getRollLayout(`${Emojis.roll_the_dice_emoji} ${response}`));
    }
}

