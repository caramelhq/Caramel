import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { resolveKey } from "@sapphire/plugin-i18next";
import type { AnySelectMenuInteraction } from "discord.js";
import { logCategories, logEventsByCategory } from "../lib/logging/catalog";
import type { LogCategoryId, LogBlockConfig } from "../lib/logging/types";
import {
  getLogsWizardSession,
  saveLogsWizardSession,
} from "../lib/logging/wizardStore";
import { LogsSetupBlockConfig } from "../lib/logging/logsSetupView";
import { getLogsWizardViewText } from "../lib/logging/wizardText";

export class LogsWizardSelectHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: AnySelectMenuInteraction) {
    if (!interaction.customId.startsWith("logswz:")) return this.none();
    return this.some(interaction.customId);
  }

  public async run(interaction: AnySelectMenuInteraction, customId: string) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) return;
    const text = await getLogsWizardViewText(interaction);

    const session = await getLogsWizardSession(guildId, userId);
    if (!session) {
      return interaction.reply({
        content: await resolveKey(
          interaction,
          "modules:module.setup.logs.messages.sessionExpired",
        ),
        flags: ["Ephemeral"],
      });
    }

    const categoryId = session.activeConfigBlock;
    if (!categoryId) return;

    // Initialize block if not exists
    if (!session.blocks[categoryId]) {
      const events = logEventsByCategory.get(categoryId) ?? [];
      session.blocks[categoryId] = {
        channelId: null,
        autoCreate: false,
        enabledEvents: events.map((e) => e.id),
      };
    }

    const block = session.blocks[categoryId]!;

    // Event select
    if (customId === "logswz:event:select") {
      if (interaction.isStringSelectMenu()) {
        block.enabledEvents = interaction.values;
        session.blocks[categoryId] = block;
        await saveLogsWizardSession(session);

        return interaction.update(
          LogsSetupBlockConfig(categoryId, block, text) as any,
        );
      }
    }

    // Channel select
    if (customId === "logswz:channel") {
      if (interaction.isChannelSelectMenu()) {
        block.channelId = interaction.values[0];
        block.autoCreate = false;
        session.blocks[categoryId] = block;
        await saveLogsWizardSession(session);

        return interaction.update(
          LogsSetupBlockConfig(categoryId, block, text) as any,
        );
      }
    }
  }
}
