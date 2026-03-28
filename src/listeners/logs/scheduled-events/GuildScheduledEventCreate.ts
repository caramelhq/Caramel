import { Listener } from '@sapphire/framework';
import { Events, type GuildScheduledEvent } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildScheduledEventCreateListener extends Listener<typeof Events.GuildScheduledEventCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildScheduledEventCreate
        });
    }

    public async run(scheduledEvent: GuildScheduledEvent) {
        const guild = scheduledEvent.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'guildScheduledEventCreate', {
            title: 'Scheduled Event Created',
            fields: [
                { name: 'Event', value: `${scheduledEvent.name} (${scheduledEvent.id})` },
                { name: 'Status', value: String(scheduledEvent.status) }
            ]
        });
    }
}
