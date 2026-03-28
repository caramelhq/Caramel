import { Listener } from '@sapphire/framework';
import { AuditLogEvent, Events } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildAuditLogEntryCreateListener extends Listener<typeof Events.GuildAuditLogEntryCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildAuditLogEntryCreate
        });
    }

    public async run(entry: any, guild: any) {
        if (!guild) return;
        if (entry.action !== AuditLogEvent.MemberPrune) return;

        await emitAdvancedLog(guild, 'guildMemberPrune', {
            title: 'Members Pruned',
            fields: [
                { name: 'Executor', value: entry.executor ? `${entry.executor.tag} (${entry.executor.id})` : 'Unknown' },
                { name: 'Pruned', value: String(entry.extra?.membersRemoved ?? 'Unknown'), inline: true },
                { name: 'Days', value: String(entry.extra?.deleteMemberDays ?? 'Unknown'), inline: true }
            ]
        });
    }
}
