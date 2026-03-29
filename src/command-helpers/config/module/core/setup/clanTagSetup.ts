import { Subcommand } from '@sapphire/plugin-subcommands';
import { resolveKey } from '@sapphire/plugin-i18next';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { prisma } from '../../../../../database/db';
import { moduleDefaults, moduleIds, moduleTextInputIds, moduleTimeoutsMs } from '../constants';
import { resolveChannel, resolveRole, runSetupFlow, createPrivateChannel } from './sharedConfirmation';

export async function handleClanTagSetup(interaction: Subcommand.ChatInputCommandInteraction) {
    const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId! } });
    const modalTitle = await resolveKey(interaction, 'modules:module.setup.clantag.modal.title');
    const roleLabel = await resolveKey(interaction, 'modules:module.setup.clantag.modal.roleLabel');
    const rolePlaceholder = await resolveKey(interaction, 'modules:module.setup.clantag.modal.rolePlaceholder');
    const channelLabel = await resolveKey(interaction, 'modules:module.setup.clantag.modal.channelLabel');
    const channelPlaceholder = await resolveKey(interaction, 'modules:module.setup.clantag.modal.channelPlaceholder');

    // Matching is now done by guild ID (primaryGuild.identityGuildId === guild.id) — no tag string needed.
    const modal = new ModalBuilder()
        .setCustomId(`clantag_setup_${interaction.id}`)
        .setTitle(modalTitle)
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(moduleTextInputIds.role)
                    .setLabel(roleLabel)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder(rolePlaceholder)
                    .setValue(config?.clanTagRoleId ?? '')
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(moduleTextInputIds.channel)
                    .setLabel(channelLabel)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder(channelPlaceholder)
                    .setValue(config?.clanTagChannelId ?? '')
            )
        );

    await interaction.showModal(modal);

    const modalSubmit = await interaction.awaitModalSubmit({
        time: moduleTimeoutsMs.setupModal,
        filter: (i) => i.customId === `clantag_setup_${interaction.id}`
    }).catch(() => null);

    if (!modalSubmit) return;

    await modalSubmit.deferReply();

    const { guild } = modalSubmit;
    const roleRaw = modalSubmit.fields.getTextInputValue(moduleTextInputIds.role).trim();
    const channelRaw = modalSubmit.fields.getTextInputValue(moduleTextInputIds.channel).trim();

    const roleResult = await resolveRole(modalSubmit, roleRaw, guild!, `Clan Tag Role [${guild!.name}]`);
    if (roleResult.error) {
        return modalSubmit.editReply({ content: roleResult.error });
    }

    const channelResult = await resolveChannel(modalSubmit, channelRaw, guild!, moduleDefaults.clanTagChannelName);
    if (channelResult.error) {
        return modalSubmit.editReply({ content: channelResult.error });
    }

    await runSetupFlow(
        modalSubmit,
        moduleIds.clantag,
        [roleResult.action, channelResult.action],
        async (data, summaryActions) => {
            if (roleResult.resolvedId) {
                data.clanTagRoleId = roleResult.resolvedId;
                data.clanTagRoleCreatedByBot = false;
                const roleLinked = await resolveKey(modalSubmit, 'modules:module.setup.summary.roleLinked', { id: roleResult.resolvedId });
                summaryActions.push(roleLinked);
            } else {
                const newRole = await guild!.roles.create({ name: roleRaw || `Clan Tag Role [${guild!.name}]` });
                data.clanTagRoleId = newRole.id;
                data.clanTagRoleCreatedByBot = true;
                const roleCreated = await resolveKey(modalSubmit, 'modules:module.setup.summary.roleCreated', { id: newRole.id });
                summaryActions.push(roleCreated);
            }

            if (channelResult.resolvedId) {
                data.clanTagChannelId = channelResult.resolvedId;
                data.clanTagChannelCreatedByBot = false;
                const channelLinked = await resolveKey(modalSubmit, 'modules:module.setup.summary.channelLinked', { id: channelResult.resolvedId });
                summaryActions.push(channelLinked);
            } else {
                const newChannel = await createPrivateChannel(guild!, channelRaw || moduleDefaults.clanTagChannelName);
                data.clanTagChannelId = newChannel.id;
                data.clanTagChannelCreatedByBot = true;
                const channelCreated = await resolveKey(modalSubmit, 'modules:module.setup.summary.channelCreated', { id: newChannel.id });
                summaryActions.push(channelCreated);
            }
        }
    );
}
