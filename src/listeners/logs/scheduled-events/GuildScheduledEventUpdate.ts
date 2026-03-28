import { Listener } from '@sapphire/framework';
import { Events, type GuildScheduledEvent } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildScheduledEventUpdateListener extends Listener<typeof Events.GuildScheduledEventUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildScheduledEventUpdate
        });
    }

    public async run(oldEvent: GuildScheduledEvent, newEvent: GuildScheduledEvent) {
        const guild = newEvent.guild;
        if (!guild) return;

        const changes: string[] = [];

        if (oldEvent.name !== newEvent.name) changes.push(`name: ${oldEvent.name} -> ${newEvent.name}`);
        if (oldEvent.description !== newEvent.description) changes.push('description updated');
        if (oldEvent.status !== newEvent.status) changes.push(`status: ${oldEvent.status} -> ${newEvent.status}`);

        if (changes.length === 0) return;

        await emitAdvancedLog(guild, 'guildScheduledEventUpdate', {
            title: 'Scheduled Event Updated',
            fields: [
                { name: 'Event', value: `${newEvent.name} (${newEvent.id})` },
                { name: 'Changes', value: changes.join('\n') }
            ]
        });
    }
}
