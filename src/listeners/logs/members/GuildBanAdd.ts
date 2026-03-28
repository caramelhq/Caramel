import { Listener } from '@sapphire/framework';
import { Events, type GuildBan } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildBanAddListener extends Listener<typeof Events.GuildBanAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildBanAdd
        });
    }

    public async run(ban: GuildBan) {
        await emitAdvancedLog(ban.guild, 'guildBanAdd', {
            title: 'Member Banned',
            fields: [
                { name: 'User', value: `${ban.user.tag} (${ban.user.id})` },
                { name: 'Reason', value: ban.reason ?? 'No reason provided' }
            ]
        });
    }
}
