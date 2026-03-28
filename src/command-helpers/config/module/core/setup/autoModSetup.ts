import { Subcommand } from '@sapphire/plugin-subcommands';
import { resolveKey } from '@sapphire/plugin-i18next';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { getCancelledLayout } from '../../../../../lib/layouts/modCommandLayouts';
import {
    moduleConfirmInputs,
    moduleIds,
    moduleTextInputIds,
    moduleTimeoutsMs
} from '../constants';
import { runSetupFlow } from './sharedConfirmation';

export async function handleAutoModSetup(interaction: Subcommand.ChatInputCommandInteraction) {
    const modalTitle = await resolveKey(interaction, 'modules:module.setup.automod.modal.title');
    const confirmLabel = await resolveKey(interaction, 'modules:module.setup.automod.modal.confirmLabel');
    const confirmPlaceholder = await resolveKey(interaction, 'modules:module.setup.automod.modal.confirmPlaceholder');
    const confirmDefault = await resolveKey(interaction, 'modules:module.setup.automod.modal.confirmDefault');

    const modal = new ModalBuilder()
        .setCustomId(`automod_setup_${interaction.id}`)
        .setTitle(modalTitle)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(moduleTextInputIds.confirm)
                    .setLabel(confirmLabel)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder(confirmPlaceholder)
                    .setValue(confirmDefault)
            )
        );

    await interaction.showModal(modal);

    const modalSubmit = await interaction.awaitModalSubmit({
        time: moduleTimeoutsMs.autoModSetupModal,
        filter: (i) => i.customId === `automod_setup_${interaction.id}`
    }).catch(() => null);

    if (!modalSubmit) return;

    await modalSubmit.deferReply();

    const confirmText = modalSubmit.fields.getTextInputValue(moduleTextInputIds.confirm).trim().toLowerCase();
    if (!moduleConfirmInputs.includes(confirmText as (typeof moduleConfirmInputs)[number])) {
        const setupAborted = await resolveKey(modalSubmit, 'modules:module.setup.errors.setupAborted');
        return modalSubmit.editReply({ ...getCancelledLayout(setupAborted) });
    }

    const previewInitialize = await resolveKey(modalSubmit, 'modules:module.setup.automod.preview.initialize');
    const previewUnlock = await resolveKey(modalSubmit, 'modules:module.setup.automod.preview.unlockCommands');
    const summaryInitialized = await resolveKey(modalSubmit, 'modules:module.setup.automod.summary.initialized');
    const summaryHint = await resolveKey(modalSubmit, 'modules:module.setup.automod.summary.hint');

    await runSetupFlow(
        modalSubmit,
        moduleIds.automod,
        [previewInitialize, previewUnlock],
        async (data, summaryActions) => {
            data.automodModule = true;
            summaryActions.push(summaryInitialized);
            summaryActions.push(summaryHint);
        }
    );
}
