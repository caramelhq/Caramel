import { Listener } from '@sapphire/framework';
import { Events, type Message, type PartialMessage } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class MessageDeleteListener extends Listener<typeof Events.MessageDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageDelete
        });
    }

    public async run(message: Message | PartialMessage) {
        if (!message.guild || message.author?.bot) return;

        if ((message as any).poll) {
            await emitAdvancedLog(message.guild, 'pollDelete', {
                title: 'Poll Deleted',
                fields: [
                    { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                    { name: 'Message ID', value: message.id, inline: true }
                ]
            });
        }

        const content = message.content?.trim();
        const preview = content ? content.slice(0, 1000) : 'No content available (partial/cached miss).';

        await emitAdvancedLog(message.guild, 'messageDelete', {
            title: 'Message Deleted',
            fields: [
                { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
                { name: 'Content', value: preview }
            ]
        });
    }
}
