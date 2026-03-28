import { Listener } from '@sapphire/framework';
import { Events, type AutoModerationRule } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class AutoModerationRuleCreateListener extends Listener<typeof Events.AutoModerationRuleCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.AutoModerationRuleCreate
        });
    }

    public async run(rule: AutoModerationRule) {
        await emitAdvancedLog(rule.guild, 'autoModerationRuleCreate', {
            title: 'AutoMod Rule Created',
            fields: [
                { name: 'Rule', value: `${rule.name} (${rule.id})` },
                { name: 'Trigger Type', value: String(rule.triggerType) }
            ]
        });
    }
}
