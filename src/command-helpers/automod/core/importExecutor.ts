import { resolveKey } from '@sapphire/plugin-i18next';
import { AutoModerationRule, AutoModerationRuleCreateOptions, ButtonInteraction, Collection, Snowflake } from 'discord.js';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { Emojis } from '../../../lib/constants/emojis';
import { SINGULAR_TRIGGER_TYPES } from './metaLabels';

type ExecuteImportParams = {
    interaction: ButtonInteraction;
    rulesMap: Map<string, AutoModerationRuleCreateOptions>;
    currentRules: Collection<Snowflake, AutoModerationRule>;
    logger: { error: (error: unknown) => void };
};

export async function executeAutoModImport(params: ExecuteImportParams) {
    const { interaction, rulesMap, currentRules, logger } = params;

    await interaction.deferUpdate();
    const rulesToProcess = Array.from(rulesMap.values()).filter((rule) => rule.enabled);
    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];

    try {
        for (const rule of rulesToProcess) {
            const type = rule.triggerType as number;

            if (SINGULAR_TRIGGER_TYPES.has(type)) {
                const existing = currentRules.find((currentRule) => currentRule.triggerType === type);
                if (existing) {
                    await existing.edit({
                        eventType: rule.eventType,
                        triggerMetadata: rule.triggerMetadata,
                        actions: rule.actions,
                        enabled: true,
                        name: rule.name
                    });
                    updated.push(rule.name);
                } else {
                    await interaction.guild!.autoModerationRules.create(rule);
                    created.push(rule.name);
                }
            } else {
                try {
                    const conflict = currentRules.find((currentRule) => currentRule.name === rule.name);
                    const name = conflict ? `${rule.name} (Copy)` : rule.name;
                    await interaction.guild!.autoModerationRules.create({ ...rule, name });
                    created.push(name);
                } catch {
                    skipped.push(rule.name);
                }
            }
        }

        const entries = [...created, ...updated].map((name) => `• ${name}`).join('\n');
        const importCompleted = await resolveKey(interaction, 'automodcommands:import.importCompleted', {
            check: Emojis.check_emoji,
            created: created.length,
            updated: updated.length,
            skipped: skipped.length,
            entries
        });

        await interaction.editReply({ ...getMessageLayout(importCompleted) });
    } catch (error: unknown) {
        logger.error(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        const importError = await resolveKey(interaction, 'automodcommands:import.error', { message });
        await interaction.editReply({ ...getMessageLayout(importError) });
    }
}
