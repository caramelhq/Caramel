import { Listener } from '@sapphire/framework';
import { Events, type GuildTextBasedChannel, type Message, type PartialMessage, type ReadonlyCollection } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class MessageDeleteBulkListener extends Listener<typeof Events.MessageBulkDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageBulkDelete
        });
    }

    public async run(messages: ReadonlyCollection<string, Message<true> | PartialMessage<true>>, channel: GuildTextBasedChannel) {
        const guild = channel.guild;
        const channelId = channel.id;

        if (!guild || !channelId || messages.size === 0) return;

        await emitAdvancedLog(guild, 'messageDeleteBulk', {
            title: 'Bulk Message Delete',
            fields: [
                { name: 'Channel', value: `<#${channelId}>`, inline: true },
                { name: 'Deleted Messages', value: String(messages.size), inline: true }
            ]
        });
    }
}
