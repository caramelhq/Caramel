import { resolveKey } from '@sapphire/plugin-i18next';
import {
    ActionRowBuilder,
    AutoModerationActionOptions,
    AutoModerationRuleCreateOptions,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ComponentType,
    Message,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle,
    InteractionEditReplyOptions,
    InteractionReplyOptions
} from 'discord.js';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { getActionTypeLabel, getPresetLabel, getTriggerTypeLabel } from './metaLabels';

type ContainerLike = {
    components: unknown[];
};

type MessageLayoutLike = {
    components: ContainerLike[];
};

type RunRuleInspectorParams = {
    interaction: StringSelectMenuInteraction;
    rulesMap: Map<string, AutoModerationRuleCreateOptions>;
    ruleName: string;
    sessionId: string;
};

export async function runAutoModRuleInspector(params: RunRuleInspectorParams) {
    const { interaction, rulesMap, ruleName, sessionId } = params;

    let active = true;
    const userId = interaction.user.id;

    while (active) {
        const rule = rulesMap.get(ruleName);
        if (!rule) return;

        const type = rule.triggerType as number;
        const inspectorTitle = await resolveKey(interaction, 'automodcommands:import.inspector.title', { name: rule.name });
        const inspectorType = await resolveKey(interaction, 'automodcommands:import.inspector.type', { type: getTriggerTypeLabel(type) });
        const inspectorActions = await resolveKey(interaction, 'automodcommands:import.inspector.actions', { actions: rule.actions.map((action) => getActionTypeLabel(action.type)).join(', ') });

        const details = [
            inspectorTitle,
            inspectorType,
            inspectorActions,
            '',
            rule.triggerMetadata?.keywordFilter
                ? await resolveKey(interaction, 'automodcommands:import.inspector.keywords', {
                    count: rule.triggerMetadata.keywordFilter.length,
                    value: `${rule.triggerMetadata.keywordFilter.slice(0, 5).join(', ')}${rule.triggerMetadata.keywordFilter.length > 5 ? '...' : ''}`
                })
                : null,
            rule.triggerMetadata?.regexPatterns
                ? await resolveKey(interaction, 'automodcommands:import.inspector.regex', { value: rule.triggerMetadata.regexPatterns.join(', ') })
                : null,
            rule.triggerMetadata?.mentionTotalLimit
                ? await resolveKey(interaction, 'automodcommands:import.inspector.mentionLimit', { value: rule.triggerMetadata.mentionTotalLimit })
                : null,
            rule.triggerMetadata?.presets
                ? await resolveKey(interaction, 'automodcommands:import.inspector.nativePresets', {
                    value: rule.triggerMetadata.presets.map((preset) => getPresetLabel(preset)).join(', ')
                })
                : null
        ].filter((entry): entry is string => entry !== null).join('\n');

        const btnTrigger = `edit_trig_${sessionId}`;
        const btnActions = `edit_act_${sessionId}`;
        const btnBack = `edit_back_${sessionId}`;

        const inspectorLayout = getMessageLayout(details) as MessageLayoutLike;
        const container = inspectorLayout.components[0];
        const editTriggerLabel = await resolveKey(interaction, 'automodcommands:import.buttons.editTrigger');
        const editActionsLabel = await resolveKey(interaction, 'automodcommands:import.buttons.editActions');
        const backLabel = await resolveKey(interaction, 'automodcommands:import.buttons.back');

        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(btnTrigger).setLabel(editTriggerLabel).setStyle(ButtonStyle.Primary).setEmoji('✏️'),
            new ButtonBuilder().setCustomId(btnActions).setLabel(editActionsLabel).setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId(btnBack).setLabel(backLabel).setStyle(ButtonStyle.Secondary)
        );
        container.components.push(buttons.toJSON());

        await interaction.editReply(inspectorLayout as unknown as InteractionEditReplyOptions);
        const response = await interaction.fetchReply() as Message;
        const btnInteraction = await response.awaitMessageComponent({
            componentType: ComponentType.Button,
            time: 60000,
            filter: (buttonInteraction) => buttonInteraction.user.id === userId
        }).catch(() => null);

        if (!btnInteraction || btnInteraction.customId === btnBack) {
            active = false;
            if (btnInteraction) {
                const returning = await resolveKey(interaction, 'automodcommands:import.returning');
                await btnInteraction.update({ ...getMessageLayout(returning) });
            }
            continue;
        }

        if (btnInteraction.customId === btnTrigger) {
            await handleTriggerEdit({
                baseInteraction: interaction,
                buttonInteraction: btnInteraction,
                rule,
                sessionId,
                type
            });
        }

        if (btnInteraction.customId === btnActions) {
            await handleActionEdit({
                baseInteraction: interaction,
                buttonInteraction: btnInteraction,
                rule,
                sessionId,
                userId
            });
        }
    }
}

type TriggerEditParams = {
    baseInteraction: StringSelectMenuInteraction;
    buttonInteraction: ButtonInteraction;
    rule: AutoModerationRuleCreateOptions;
    sessionId: string;
    type: number;
};

async function handleTriggerEdit(params: TriggerEditParams) {
    const { baseInteraction, buttonInteraction, rule, sessionId, type } = params;

    if (type === 1) {
        const editKeywordsTitle = await resolveKey(baseInteraction, 'automodcommands:import.inspector.editKeywordsTitle', { name: rule.name });
        const editRegexLabel = await resolveKey(baseInteraction, 'automodcommands:import.inspector.editRegexLabel');
        const editKeywordsLabel = await resolveKey(baseInteraction, 'automodcommands:import.inspector.editKeywordsLabel');
        const modal = new ModalBuilder().setCustomId(`modal_trig_${sessionId}`).setTitle(editKeywordsTitle);
        const input = new TextInputBuilder()
            .setCustomId('content')
            .setLabel(rule.triggerMetadata?.regexPatterns ? editRegexLabel : editKeywordsLabel)
            .setStyle(TextInputStyle.Paragraph)
            .setValue(rule.triggerMetadata?.regexPatterns ? rule.triggerMetadata.regexPatterns.join('\n') : rule.triggerMetadata?.keywordFilter?.join(', ') || '')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

        await buttonInteraction.showModal(modal);
        const modalSubmit = await buttonInteraction.awaitModalSubmit({
            time: 60000,
            filter: (submission) => submission.customId === `modal_trig_${sessionId}`
        }).catch(() => null);

        if (modalSubmit) {
            const value = modalSubmit.fields.getTextInputValue('content');
            if (rule.triggerMetadata?.regexPatterns) {
                rule.triggerMetadata.regexPatterns = [value];
            } else if (rule.triggerMetadata) {
                rule.triggerMetadata.keywordFilter = value.split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
            }
            const triggerUpdated = await resolveKey(baseInteraction, 'automodcommands:import.triggerUpdated');
            await modalSubmit.reply({ ...getMessageLayout(triggerUpdated), flags: ['Ephemeral', 'IsComponentsV2'] });
        }
        return;
    }

    if (type === 5) {
        const editMentionTitle = await resolveKey(baseInteraction, 'automodcommands:import.inspector.editMentionTitle');
        const editMentionLabel = await resolveKey(baseInteraction, 'automodcommands:import.inspector.editMentionLabel');
        const modal = new ModalBuilder().setCustomId(`modal_ment_${sessionId}`).setTitle(editMentionTitle);
        const input = new TextInputBuilder()
            .setCustomId('limit')
            .setLabel(editMentionLabel)
            .setStyle(TextInputStyle.Short)
            .setValue(rule.triggerMetadata?.mentionTotalLimit?.toString() || '5')
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

        await buttonInteraction.showModal(modal);
        const modalSubmit = await buttonInteraction.awaitModalSubmit({
            time: 60000,
            filter: (submission) => submission.customId === `modal_ment_${sessionId}`
        }).catch(() => null);

        if (modalSubmit) {
            const value = Number.parseInt(modalSubmit.fields.getTextInputValue('limit'), 10);
            if (!Number.isNaN(value) && rule.triggerMetadata) {
                rule.triggerMetadata.mentionTotalLimit = value;
            }
            const limitUpdated = await resolveKey(baseInteraction, 'automodcommands:import.limitUpdated');
            await modalSubmit.reply({ ...getMessageLayout(limitUpdated), flags: ['Ephemeral', 'IsComponentsV2'] });
        }
        return;
    }

    const errorMessage = type === 4
        ? await resolveKey(baseInteraction, 'automodcommands:import.nativePresetLocked')
        : await resolveKey(baseInteraction, 'automodcommands:import.triggerNotEditable');
    await buttonInteraction.reply({ ...getMessageLayout(errorMessage), flags: ['Ephemeral', 'IsComponentsV2'] });
}

type ActionEditParams = {
    baseInteraction: StringSelectMenuInteraction;
    buttonInteraction: ButtonInteraction;
    rule: AutoModerationRuleCreateOptions;
    sessionId: string;
    userId: string;
};

async function handleActionEdit(params: ActionEditParams) {
    const { baseInteraction, buttonInteraction, rule, sessionId, userId } = params;

    const selectId = `sel_act_${sessionId}`;
    const hasTimeout = rule.actions.some((action) => action.type === 3);

    const actionPlaceholder = await resolveKey(baseInteraction, 'automodcommands:import.select.actionPlaceholder');
    const blockOnly = await resolveKey(baseInteraction, 'automodcommands:import.select.blockOnly');
    const blockOnlyDescription = await resolveKey(baseInteraction, 'automodcommands:import.select.blockOnlyDescription');
    const blockTimeout = await resolveKey(baseInteraction, 'automodcommands:import.select.blockTimeout');
    const blockTimeoutDescription = await resolveKey(baseInteraction, 'automodcommands:import.select.blockTimeoutDescription');

    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setCustomId(selectId).setPlaceholder(actionPlaceholder).addOptions([
            { label: blockOnly, value: 'block', description: blockOnlyDescription, default: !hasTimeout },
            { label: blockTimeout, value: 'timeout', description: blockTimeoutDescription, default: hasTimeout }
        ])
    );

    const configureActions = await resolveKey(baseInteraction, 'automodcommands:import.configureActions');
    const actionLayout = getMessageLayout(configureActions) as MessageLayoutLike;
    const actionContainer = actionLayout.components[0];
    actionContainer.components.push(select.toJSON());

    const actionReplyOptions = { ...actionLayout, flags: ['Ephemeral', 'IsComponentsV2'], fetchReply: true } as unknown as InteractionReplyOptions & { fetchReply: true };
    const actionResponse = await buttonInteraction.reply(actionReplyOptions) as Message;
    const actionInteraction = await actionResponse.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: 60000,
        filter: (selectionInteraction) => selectionInteraction.customId === selectId && selectionInteraction.user.id === userId
    }).catch(() => null);

    if (!actionInteraction) return;

    const mode = actionInteraction.values[0];
    const newActions: AutoModerationActionOptions[] = [{ type: 1 }];
    if (mode === 'timeout') {
        newActions.push({ type: 3, metadata: { durationSeconds: 60 } });
    }

    rule.actions = newActions;
    const actionsUpdated = await resolveKey(baseInteraction, 'automodcommands:import.actionsUpdated');
    await actionInteraction.update({ ...getMessageLayout(actionsUpdated) });
}
