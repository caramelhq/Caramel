import { Listener } from '@sapphire/framework';
import { Events, type GuildScheduledEvent } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildScheduledEventDeleteListener extends Listener<typeof Events.GuildScheduledEventDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildScheduledEventDelete
        });
    }

    public async run(scheduledEvent: GuildScheduledEvent) {
        const guild = scheduledEvent.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'guildScheduledEventDelete', {
            title: 'Scheduled Event Deleted',
            fields: [
                { name: 'Event', value: `${scheduledEvent.name} (${scheduledEvent.id})` }
            ]
        });
    }
}
