import { Listener } from '@sapphire/framework';
import { Events, type AnyThreadChannel } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class ThreadUpdateListener extends Listener<typeof Events.ThreadUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ThreadUpdate
        });
    }

    public async run(oldThread: AnyThreadChannel, newThread: AnyThreadChannel) {
        const changes: string[] = [];

        if (oldThread.name !== newThread.name) changes.push(`name: ${oldThread.name} -> ${newThread.name}`);
        if (oldThread.archived !== newThread.archived) changes.push(`archived: ${oldThread.archived} -> ${newThread.archived}`);
        if (oldThread.locked !== newThread.locked) changes.push(`locked: ${oldThread.locked} -> ${newThread.locked}`);

        if (changes.length === 0) return;

        await emitAdvancedLog(newThread.guild, 'threadUpdate', {
            title: 'Thread Updated',
            fields: [
                { name: 'Thread', value: `${newThread.name} (${newThread.id})` },
                { name: 'Changes', value: changes.join('\n') }
            ]
        });
    }
}
