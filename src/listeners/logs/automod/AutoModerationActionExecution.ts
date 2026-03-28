import { Listener } from '@sapphire/framework';
import { Events, type AutoModerationActionExecution } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class AutoModerationActionExecutionListener extends Listener<typeof Events.AutoModerationActionExecution> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.AutoModerationActionExecution
        });
    }

    public async run(execution: AutoModerationActionExecution) {
        const guild = execution.guild;
        if (!guild) return;

        await emitAdvancedLog(guild, 'autoModerationActionExecution', {
            title: 'AutoMod Action Executed',
            fields: [
                { name: 'Rule ID', value: execution.ruleId },
                { name: 'User ID', value: execution.userId },
                { name: 'Action', value: String(execution.action.type) },
                { name: 'Content', value: execution.content ? execution.content.slice(0, 900) : 'No content' }
            ]
        });
    }
}
