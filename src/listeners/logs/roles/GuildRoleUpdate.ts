import { Listener } from '@sapphire/framework';
import { Events, type Role } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildRoleUpdateListener extends Listener<typeof Events.GuildRoleUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildRoleUpdate
        });
    }

    public async run(oldRole: Role, newRole: Role) {
        const changes: string[] = [];

        if (oldRole.name !== newRole.name) changes.push(`name: ${oldRole.name} -> ${newRole.name}`);
        if (oldRole.color !== newRole.color) {
            changes.push(`color: #${oldRole.color.toString(16).padStart(6, '0')} -> #${newRole.color.toString(16).padStart(6, '0')}`);
        }
        if (oldRole.hoist !== newRole.hoist) changes.push(`hoist: ${oldRole.hoist} -> ${newRole.hoist}`);
        if (oldRole.mentionable !== newRole.mentionable) changes.push(`mentionable: ${oldRole.mentionable} -> ${newRole.mentionable}`);
        if (!oldRole.permissions.equals(newRole.permissions)) changes.push('permissions updated');

        if (changes.length === 0) return;

        await emitAdvancedLog(newRole.guild, 'roleUpdate', {
            title: 'Role Updated',
            fields: [
                { name: 'Role', value: `${newRole.name} (${newRole.id})` },
                { name: 'Changes', value: changes.join('\n').slice(0, 1000) }
            ]
        });
    }
}
