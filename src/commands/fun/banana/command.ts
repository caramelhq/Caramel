import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { Message } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getBananaLayout } from '../../../lib/layouts/funLayouts';
import { Emojis } from '../../../lib/constants/emojis';
import funCommandsEnUs from '../../../lib/i18n/en-US/funcommands.json';
import funCommandsEsEs from '../../../lib/i18n/es-ES/funcommands.json';


// Constants ──────────────────

const BANANA_IMAGE_URL = 'https://em-content.zobj.net/source/google/439/banana_1f34c.png';
const MIN_CM = 0;
const MAX_CM = 30;


// Helpers ──────────────────

function randomBanana(): number {
    return Math.floor(Math.random() * (MAX_CM - MIN_CM + 1)) + MIN_CM;
}

async function getResultLabel(interactionOrMessage: Command.ChatInputCommandInteraction | Message, cm: number): Promise<string> {
    if (cm === 0)  return resolveKey(interactionOrMessage, 'funcommands:banana.results.tragic', { emoji: Emojis.banana_result_tragic });
    if (cm <= 5)   return resolveKey(interactionOrMessage, 'funcommands:banana.results.rough', { emoji: Emojis.banana_result_rough });
    if (cm <= 10)  return resolveKey(interactionOrMessage, 'funcommands:banana.results.mid', { emoji: Emojis.banana_result_mid });
    if (cm <= 20)  return resolveKey(interactionOrMessage, 'funcommands:banana.results.notBad', { emoji: Emojis.banana_result_notBad });
    if (cm <= 28)  return resolveKey(interactionOrMessage, 'funcommands:banana.results.impressive', { emoji: Emojis.banana_result_impressive });
    return         resolveKey(interactionOrMessage, 'funcommands:banana.results.legendary', { emoji: Emojis.banana_result_legendary });
}


// Banana command ──────────────────

@ApplyOptions<Command.Options>({
    name: 'banana',
    description: funCommandsEnUs.command.banana.description,
})
export class BananaCommand extends Command {
    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': funCommandsEsEs.command.banana.description })
                .setIntegrationTypes([0, 1])
                .setContexts([0, 1, 2])
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        return interaction.reply(await this.getBananaResponse(interaction));
    }

    public override async messageRun(message: Message) {
        return message.reply(await this.getBananaResponse(message));
    }

    private async getBananaResponse(interactionOrMessage: Command.ChatInputCommandInteraction | Message) {
        const target = 'user' in interactionOrMessage ? interactionOrMessage.user : interactionOrMessage.author;
        const cm = randomBanana();
        const label = await getResultLabel(interactionOrMessage, cm);
        const content = await resolveKey(interactionOrMessage, 'funcommands:banana.response', { user: target.displayName ?? target.username, cm, emoji: Emojis.banana_emoji });

        return getBananaLayout(content, BANANA_IMAGE_URL, label);
    }
}
