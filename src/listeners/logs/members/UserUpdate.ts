import { Listener } from '@sapphire/framework';
import { Events, type User } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class UserUpdateListener extends Listener<typeof Events.UserUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.UserUpdate
        });
    }

    public async run(oldUser: User, newUser: User) {
        const changes: string[] = [];

        if (oldUser.username !== newUser.username) changes.push(`username: ${oldUser.username} -> ${newUser.username}`);
        if (oldUser.globalName !== newUser.globalName) changes.push(`globalName: ${oldUser.globalName ?? 'None'} -> ${newUser.globalName ?? 'None'}`);
        if (oldUser.avatar !== newUser.avatar) changes.push('avatar updated');

        if (changes.length === 0) return;

        for (const guild of this.container.client.guilds.cache.values()) {
            if (!guild.members.cache.has(newUser.id)) continue;

            await emitAdvancedLog(guild, 'userUpdate', {
                title: 'User Updated',
                fields: [
                    { name: 'User', value: `${newUser.tag} (${newUser.id})` },
                    { name: 'Changes', value: changes.join('\n').slice(0, 1000) }
                ]
            });
        }
    }
}
