import { Listener } from '@sapphire/framework';
import { Events, type AnyThreadChannel } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class ThreadDeleteListener extends Listener<typeof Events.ThreadDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ThreadDelete
        });
    }

    public async run(thread: AnyThreadChannel) {
        await emitAdvancedLog(thread.guild, 'threadDelete', {
            title: 'Thread Deleted',
            fields: [
                { name: 'Thread', value: `${thread.name} (${thread.id})` },
                { name: 'Parent', value: thread.parentId ? `<#${thread.parentId}>` : 'Unknown' }
            ]
        });
    }
}
