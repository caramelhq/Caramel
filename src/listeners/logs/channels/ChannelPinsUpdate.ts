import { Listener } from '@sapphire/framework';
import { Events, type Channel } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class ChannelPinsUpdateListener extends Listener<typeof Events.ChannelPinsUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ChannelPinsUpdate
        });
    }

    public async run(channel: Channel, date: Date) {
        if (!('guild' in channel) || !channel.guild) return;

        await emitAdvancedLog(channel.guild, 'channelPinsUpdate', {
            title: 'Channel Pins Updated',
            fields: [
                { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                { name: 'Updated At', value: `<t:${Math.floor(date.getTime() / 1000)}:f>`, inline: true }
            ]
        });
    }
}
