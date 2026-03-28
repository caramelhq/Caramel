import { Listener } from '@sapphire/framework';
import { Events, type AnyThreadChannel } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class ThreadCreateListener extends Listener<typeof Events.ThreadCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ThreadCreate
        });
    }

    public async run(thread: AnyThreadChannel) {
        await emitAdvancedLog(thread.guild, 'threadCreate', {
            title: 'Thread Created',
            fields: [
                { name: 'Thread', value: `${thread.name} (${thread.id})` },
                { name: 'Parent', value: thread.parentId ? `<#${thread.parentId}>` : 'Unknown' }
            ]
        });
    }
}
