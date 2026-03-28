import { Listener } from '@sapphire/framework';
import { Events, type Invite } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class InviteCreateListener extends Listener<typeof Events.InviteCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.InviteCreate
        });
    }

    public async run(invite: Invite) {
        if (!invite.guild) return;
        const guild = this.container.client.guilds.cache.get(invite.guild.id);
        if (!guild) return;

        await emitAdvancedLog(guild, 'inviteCreate', {
            title: 'Invite Created',
            fields: [
                { name: 'Code', value: invite.code, inline: true },
                { name: 'Channel', value: invite.channelId ? `<#${invite.channelId}>` : 'Unknown', inline: true },
                { name: 'Creator', value: invite.inviter ? `${invite.inviter.tag} (${invite.inviter.id})` : 'Unknown' }
            ]
        });
    }
}
