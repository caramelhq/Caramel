import { resolveKey } from '@sapphire/plugin-i18next';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ActionRowBuilder, AutoModerationRule, AutoModerationRuleCreateOptions, ButtonBuilder, ButtonStyle, Collection, Snowflake } from 'discord.js';
import { getAutoModPreviewLayout } from '../../../lib/layouts/automodLayouts';
import { SINGULAR_TRIGGER_TYPES } from './metaLabels';

type PreviewRuleStatus = {
    name: string;
    status: 'enabled' | 'disabled' | 'error';
    message: string;
};

type ContainerLike = {
    components: unknown[];
};

type PreviewLayoutLike = {
    components: ContainerLike[];
};

type BuildImportPreviewParams = {
    interaction: Subcommand.ChatInputCommandInteraction;
    presetTopic: string;
    rulesMap: Map<string, AutoModerationRuleCreateOptions>;
    currentRules: Collection<Snowflake, AutoModerationRule>;
    ids: {
        confirmId: string;
        cancelId: string;
        configId: string;
    };
};

export async function buildAutoModImportPreview(params: BuildImportPreviewParams) {
    const { interaction, presetTopic, rulesMap, currentRules, ids } = params;

    const rulesStatus: PreviewRuleStatus[] = await Promise.all(Array.from(rulesMap.values()).map(async (rule) => {
        const type = rule.triggerType as number;
        const isSelected = rule.enabled;

        let status: PreviewRuleStatus['status'] = 'enabled';
        let message = `**${rule.name}**`;

        if (!isSelected) {
            status = 'disabled';
            const disabled = await resolveKey(interaction, 'automodcommands:import.status.disabled');
            message += ` (${disabled})`;
        } else {
            const existingCount = currentRules.filter((currentRule) => currentRule.triggerType === type).size;
            if (SINGULAR_TRIGGER_TYPES.has(type)) {
                const existing = currentRules.find((currentRule) => currentRule.triggerType === type);
                const updateExisting = await resolveKey(interaction, 'automodcommands:import.status.updateExisting');
                const createNew = await resolveKey(interaction, 'automodcommands:import.status.createNew');
                message += existing ? ` (${updateExisting})` : ` (${createNew})`;
            } else if (type === 1) {
                if (existingCount >= 6) {
                    status = 'error';
                    const limitExceeded = await resolveKey(interaction, 'automodcommands:import.status.limitExceeded', { count: existingCount });
                    message += ` (${limitExceeded})`;
                } else {
                    const createNew = await resolveKey(interaction, 'automodcommands:import.status.createNew');
                    message += ` (${createNew})`;
                }
            }
        }

        return {
            name: rule.name,
            status,
            message
        };
    }));

    const layout = getAutoModPreviewLayout({
        title: presetTopic,
        rules: rulesStatus,
        editId: `automod_edit_${interaction.id}`
    }) as PreviewLayoutLike;

    const container = layout.components[0];
    const cancelLabel = await resolveKey(interaction, 'automodcommands:import.buttons.cancel');
    const configureLabel = await resolveKey(interaction, 'automodcommands:import.buttons.configure');
    const importLabel = await resolveKey(interaction, 'automodcommands:import.buttons.import');

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(ids.cancelId).setLabel(cancelLabel).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(ids.configId).setLabel(configureLabel).setStyle(ButtonStyle.Primary).setEmoji('⚙️'),
        new ButtonBuilder().setCustomId(ids.confirmId).setLabel(importLabel).setStyle(ButtonStyle.Success)
    );

    container.components.push({ type: 14, spacing: 1, divider: true });
    container.components.push(actionRow.toJSON());

    return layout;
}
