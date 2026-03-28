import { Listener } from '@sapphire/framework';
import { Events, type GuildScheduledEvent, type User } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildScheduledEventUserAddListener extends Listener<typeof Events.GuildScheduledEventUserAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildScheduledEventUserAdd
        });
    }

    public async run(scheduledEvent: GuildScheduledEvent, user: User) {
        const guild = scheduledEvent.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'guildScheduledEventUserAdd', {
            title: 'Scheduled Event RSVP Added',
            fields: [
                { name: 'Event', value: `${scheduledEvent.name} (${scheduledEvent.id})` },
                { name: 'User', value: `${user.tag} (${user.id})` }
            ]
        });
    }
}
