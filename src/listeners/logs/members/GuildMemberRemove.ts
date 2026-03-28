import { Listener } from '@sapphire/framework';
import { Events, type GuildMember } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildMemberRemoveListener extends Listener<typeof Events.GuildMemberRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildMemberRemove
        });
    }

    public async run(member: GuildMember) {
        if (member.user.bot) return;

        await emitAdvancedLog(member.guild, 'guildMemberRemove', {
            title: 'Member Left/Removed',
            fields: [
                { name: 'User', value: `${member.user.tag} (${member.id})` },
                { name: 'Joined Server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown' }
            ]
        });
    }
}
