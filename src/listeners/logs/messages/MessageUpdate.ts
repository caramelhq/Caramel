import { Listener } from '@sapphire/framework';
import { Events, MessageFlags, type Message, type PartialMessage } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class MessageUpdateListener extends Listener<typeof Events.MessageUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageUpdate
        });
    }

    public async run(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
        if (!newMessage.guild || newMessage.author?.bot) return;

        const oldPollFinalized = Boolean((oldMessage as any).poll?.resultsFinalized);
        const newPollFinalized = Boolean((newMessage as any).poll?.resultsFinalized);
        if (!oldPollFinalized && newPollFinalized) {
            await emitAdvancedLog(newMessage.guild, 'pollFinalize', {
                title: 'Poll Finalized',
                fields: [
                    { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
                    { name: 'Message ID', value: newMessage.id, inline: true }
                ]
            });
        }

        const oldCrossposted = oldMessage.flags?.has(MessageFlags.Crossposted) ?? false;
        const newCrossposted = newMessage.flags?.has(MessageFlags.Crossposted) ?? false;
        if (!oldCrossposted && newCrossposted) {
            await emitAdvancedLog(newMessage.guild, 'messagePublish', {
                title: 'Message Published',
                fields: [
                    { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
                    { name: 'Author', value: newMessage.author ? `${newMessage.author.tag} (${newMessage.author.id})` : 'Unknown', inline: true },
                    { name: 'Message ID', value: newMessage.id }
                ]
            });
        }

        const before = oldMessage.content?.trim() ?? 'No previous content available (partial/cached miss).';
        const after = newMessage.content?.trim() ?? 'No new content available.';

        if (before === after) return;

        await emitAdvancedLog(newMessage.guild, 'messageUpdate', {
            title: 'Message Updated',
            fields: [
                { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
                { name: 'Author', value: newMessage.author ? `${newMessage.author.tag} (${newMessage.author.id})` : 'Unknown', inline: true },
                { name: 'Before', value: before.slice(0, 1000) },
                { name: 'After', value: after.slice(0, 1000) }
            ]
        });
    }
}
