import { Listener } from '@sapphire/framework';
import { AuditLogEvent, Events, type TextChannel } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class WebhooksUpdateListener extends Listener<typeof Events.WebhooksUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.WebhooksUpdate
        });
    }

    public async run(channel: TextChannel) {
        const logs = await channel.guild.fetchAuditLogs({ limit: 5 }).catch(() => null);

        let eventId: 'webhookCreate' | 'webhookUpdate' | 'webhookDelete' = 'webhookUpdate';
        let title = 'Webhook Updated';

        const latest = logs?.entries.find((entry) => (
            entry.action === AuditLogEvent.WebhookCreate
            || entry.action === AuditLogEvent.WebhookUpdate
            || entry.action === AuditLogEvent.WebhookDelete
        ));
        if (latest?.action === AuditLogEvent.WebhookCreate) {
            eventId = 'webhookCreate';
            title = 'Webhook Created';
        } else if (latest?.action === AuditLogEvent.WebhookDelete) {
            eventId = 'webhookDelete';
            title = 'Webhook Deleted';
        }

        await emitAdvancedLog(channel.guild, eventId, {
            title,
            fields: [
                { name: 'Channel', value: `<#${channel.id}> (${channel.id})` },
                { name: 'Executor', value: latest?.executor ? `${latest.executor.tag} (${latest.executor.id})` : 'Unknown' }
            ]
        });
    }
}
