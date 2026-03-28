import { Subcommand } from "@sapphire/plugin-subcommands";
import { resolveKey } from "@sapphire/plugin-i18next";
import {
  acquireLogsWizardLock,
  createInitialWizardSession,
  deleteLogsWizardSession,
  getLogsWizardLockOwner,
  releaseLogsWizardLock,
  saveLogsWizardSession,
} from "../../../../../lib/logging/wizardStore";
import { LogsSetupPage1 } from "../../../../../lib/logging/logsSetupView";
import { getLogsWizardViewText } from "../../../../../lib/logging/wizardText";

export async function handleLogsSetup(
  interaction: Subcommand.ChatInputCommandInteraction,
) {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  let lock = await acquireLogsWizardLock(guildId, userId);
  if (!lock) {
    const owner = await getLogsWizardLockOwner(guildId);
    if (owner === userId) {
      await releaseLogsWizardLock(guildId, userId);
      await deleteLogsWizardSession(guildId, userId);
      lock = await acquireLogsWizardLock(guildId, userId);
    }
    if (!lock) {
      const anotherAdmin = await resolveKey(
        interaction,
        "modules:module.setup.logs.messages.anotherAdmin",
      );
      return interaction.reply({
        content: anotherAdmin,
        flags: ["Ephemeral"],
      });
    }
  }

  const session = createInitialWizardSession(guildId, userId);
  await saveLogsWizardSession(session);
  const text = await getLogsWizardViewText(interaction);

  return interaction.reply({
    ...LogsSetupPage1(session, text),
  });
}
