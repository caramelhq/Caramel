import { Listener } from '@sapphire/framework';
import { Events, type StageInstance } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class StageInstanceDeleteListener extends Listener<typeof Events.StageInstanceDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.StageInstanceDelete
        });
    }

    public async run(stageInstance: StageInstance) {
        const guild = stageInstance.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'stageInstanceDelete', {
            title: 'Stage Ended',
            fields: [
                { name: 'Channel', value: `<#${stageInstance.channelId}>` },
                { name: 'Topic', value: stageInstance.topic || 'No topic' }
            ]
        });
    }
}
