import { Listener } from '@sapphire/framework';
import { Events, type Invite } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class InviteDeleteListener extends Listener<typeof Events.InviteDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.InviteDelete
        });
    }

    public async run(invite: Invite) {
        if (!invite.guild) return;
        const guild = this.container.client.guilds.cache.get(invite.guild.id);
        if (!guild) return;

        await emitAdvancedLog(guild, 'inviteDelete', {
            title: 'Invite Deleted',
            fields: [
                { name: 'Code', value: invite.code, inline: true },
                { name: 'Channel', value: invite.channelId ? `<#${invite.channelId}>` : 'Unknown', inline: true }
            ]
        });
    }
}
