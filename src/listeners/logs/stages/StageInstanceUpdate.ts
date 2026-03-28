import { Listener } from '@sapphire/framework';
import { Events, type StageInstance } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class StageInstanceUpdateListener extends Listener<typeof Events.StageInstanceUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.StageInstanceUpdate
        });
    }

    public async run(oldStage: StageInstance, newStage: StageInstance) {
        const guild = newStage.guild;
        if (!guild) return;

        const changes: string[] = [];

        if (oldStage.topic !== newStage.topic) changes.push(`topic: ${oldStage.topic || 'None'} -> ${newStage.topic || 'None'}`);
        if (oldStage.privacyLevel !== newStage.privacyLevel) changes.push(`privacyLevel: ${oldStage.privacyLevel} -> ${newStage.privacyLevel}`);

        if (changes.length === 0) return;

        await emitAdvancedLog(guild, 'stageInstanceUpdate', {
            title: 'Stage Updated',
            fields: [
                { name: 'Channel', value: `<#${newStage.channelId}>` },
                { name: 'Changes', value: changes.join('\n') }
            ]
        });
    }
}
