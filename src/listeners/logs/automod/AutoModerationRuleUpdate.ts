import { Listener } from '@sapphire/framework';
import { Events, type AutoModerationRule } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class AutoModerationRuleUpdateListener extends Listener<typeof Events.AutoModerationRuleUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.AutoModerationRuleUpdate
        });
    }

    public async run(oldRule: AutoModerationRule, newRule: AutoModerationRule) {
        const changes: string[] = [];

        if (oldRule.name !== newRule.name) changes.push(`name: ${oldRule.name} -> ${newRule.name}`);
        if (oldRule.enabled !== newRule.enabled) changes.push(`enabled: ${oldRule.enabled} -> ${newRule.enabled}`);
        if (oldRule.triggerType !== newRule.triggerType) changes.push(`triggerType: ${oldRule.triggerType} -> ${newRule.triggerType}`);

        if (changes.length === 0) return;

        await emitAdvancedLog(newRule.guild, 'autoModerationRuleUpdate', {
            title: 'AutoMod Rule Updated',
            fields: [
                { name: 'Rule', value: `${newRule.name} (${newRule.id})` },
                { name: 'Changes', value: changes.join('\n') }
            ]
        });
    }
}
