import { Listener } from '@sapphire/framework';
import { Events, type DMChannel, type NonThreadGuildBasedChannel } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class ChannelUpdateListener extends Listener<typeof Events.ChannelUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ChannelUpdate
        });
    }

    public async run(oldChannel: DMChannel | NonThreadGuildBasedChannel, newChannel: DMChannel | NonThreadGuildBasedChannel) {
        if (newChannel.isDMBased() || oldChannel.isDMBased()) return;

        const oldOverwrites = oldChannel.permissionOverwrites.cache.map((o) => `${o.id}:${o.allow.bitfield.toString()}:${o.deny.bitfield.toString()}`).sort().join('|');
        const newOverwrites = newChannel.permissionOverwrites.cache.map((o) => `${o.id}:${o.allow.bitfield.toString()}:${o.deny.bitfield.toString()}`).sort().join('|');
        if (oldOverwrites !== newOverwrites) {
            await emitAdvancedLog(newChannel.guild, 'channelPermissionsUpdate', {
                title: 'Channel Permissions Updated',
                fields: [
                    { name: 'Channel', value: `<#${newChannel.id}> (${newChannel.id})` },
                    { name: 'Details', value: 'Permission overwrites changed.' }
                ]
            });
        }

        const changes: string[] = [];

        if (oldChannel.name !== newChannel.name) changes.push(`name: ${oldChannel.name} -> ${newChannel.name}`);
        if (oldChannel.parentId !== newChannel.parentId) changes.push(`category: ${oldChannel.parentId ?? 'None'} -> ${newChannel.parentId ?? 'None'}`);
        if (oldChannel.position !== newChannel.position) changes.push(`position: ${oldChannel.position} -> ${newChannel.position}`);

        if (changes.length === 0) return;

        await emitAdvancedLog(newChannel.guild, 'channelUpdate', {
            title: 'Channel Updated',
            fields: [
                { name: 'Channel', value: `<#${newChannel.id}> (${newChannel.id})` },
                { name: 'Changes', value: changes.join('\n').slice(0, 1000) }
            ]
        });
    }
}
