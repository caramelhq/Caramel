import { Listener } from '@sapphire/framework';
import { Events, type AutoModerationRule } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class AutoModerationRuleDeleteListener extends Listener<typeof Events.AutoModerationRuleDelete> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.AutoModerationRuleDelete
        });
    }

    public async run(rule: AutoModerationRule) {
        await emitAdvancedLog(rule.guild, 'autoModerationRuleDelete', {
            title: 'AutoMod Rule Deleted',
            fields: [
                { name: 'Rule', value: `${rule.name} (${rule.id})` },
                { name: 'Trigger Type', value: String(rule.triggerType) }
            ]
        });
    }
}
