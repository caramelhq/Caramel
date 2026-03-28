import { Command } from '@sapphire/framework';

export function scheduleEphemeralReplyDeletion(
    interaction: Command.ChatInputCommandInteraction,
    ttlMs: number
): void {
    setTimeout(() => {
        interaction.deleteReply().catch(() => null);
    }, ttlMs);
}
