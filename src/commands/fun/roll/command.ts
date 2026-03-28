import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getRollLayout } from '../../../lib/layouts/funLayouts';
import { Emojis } from '../../../lib/constants/emojis';
import type { Message } from 'discord.js';
import funCommandsEnUs from '../../../lib/i18n/en-US/funcommands.json';
import funCommandsEsEs from '../../../lib/i18n/es-ES/funcommands.json';

@ApplyOptions<Command.Options>({
    name: 'roll',
    aliases: ['dice'],
    description: funCommandsEnUs.command.roll.description
})
export class RollCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': funCommandsEsEs.command.roll.description })
                .setIntegrationTypes([0, 1])
                .setContexts([0, 1, 2])
                .addIntegerOption((option) =>
                    option
                        .setName('max')
                        .setDescription(funCommandsEnUs.command.roll.options.max)
                        .setDescriptionLocalizations({ 'es-ES': funCommandsEsEs.command.roll.options.max })
                        .setMinValue(2)
                        .setMaxValue(1000000)
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const max = interaction.options.getInteger('max') ?? 6;
        const result = Math.floor(Math.random() * max) + 1;

        const content = await resolveKey(interaction, 'funcommands:roll.result', {
            emoji: Emojis.roll_the_dice_emoji,
            result,
            max
        });

        return interaction.reply(getRollLayout(content));
    }

    public override async messageRun(message: Message, args: Args) {
        const max = await args.pick('integer').catch(() => 6);
        const result = Math.floor(Math.random() * max) + 1;

        const content = await resolveKey(message, 'funcommands:roll.result', {
            emoji: Emojis.roll_the_dice_emoji,
            result,
            max
        });

        return message.reply(getRollLayout(content));
    }
}
