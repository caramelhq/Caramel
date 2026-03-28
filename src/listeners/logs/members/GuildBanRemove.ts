import { Listener } from '@sapphire/framework';
import { Events, type GuildBan } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildBanRemoveListener extends Listener<typeof Events.GuildBanRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildBanRemove
        });
    }

    public async run(ban: GuildBan) {
        await emitAdvancedLog(ban.guild, 'guildBanRemove', {
            title: 'Member Unbanned',
            fields: [
                { name: 'User', value: `${ban.user.tag} (${ban.user.id})` }
            ]
        });
    }
}
