import { Listener } from '@sapphire/framework';
import { Events, type StageInstance } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class StageInstanceCreateListener extends Listener<typeof Events.StageInstanceCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.StageInstanceCreate
        });
    }

    public async run(stageInstance: StageInstance) {
        const guild = stageInstance.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'stageInstanceCreate', {
            title: 'Stage Started',
            fields: [
                { name: 'Channel', value: `<#${stageInstance.channelId}>`, inline: true },
                { name: 'Topic', value: stageInstance.topic || 'No topic', inline: true }
            ]
        });
    }
}
