import { Listener } from '@sapphire/framework';
import { Events, type Role } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildRoleCreateListener extends Listener<typeof Events.GuildRoleCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildRoleCreate
        });
    }

    public async run(role: Role) {
        await emitAdvancedLog(role.guild, 'roleCreate', {
            title: 'Role Created',
            fields: [
                { name: 'Role', value: `${role.name} (${role.id})` },
                { name: 'Color', value: `#${role.color.toString(16).padStart(6, '0')}` }
            ]
        });
    }
}
