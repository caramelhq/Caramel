import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { resolveKey } from "@sapphire/plugin-i18next";
import type { ButtonInteraction } from "discord.js";
import { logCategories, logEventsByCategory } from "../lib/logging/catalog";
import { setLogsGuildConfig } from "../lib/logging/configStore";
import type { LogCategoryId, LogBlockConfig } from "../lib/logging/types";
import {
  deleteLogsWizardSession,
  getLogsWizardSession,
  releaseLogsWizardLock,
  saveLogsWizardSession,
} from "../lib/logging/wizardStore";
import {
  LogsSetupPage1,
  LogsSetupPage2,
  LogsSetupPage3,
  LogsSetupConfigPage,
  LogsSetupBlockConfig,
  LogsSetupReview,
} from "../lib/logging/logsSetupView";
import { getLogsWizardViewText } from "../lib/logging/wizardText";
import { getMessageLayout } from "../lib/layouts/defaultLayout";
import { applyLoadingState } from "../lib/layouts/modCommandLayouts";

export class LogsWizardButtonHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("logswz:")) return this.none();
    return this.some(interaction.customId);
  }

  public async run(interaction: ButtonInteraction, customId: string) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    if (!guildId) return;

    await interaction.deferUpdate().catch(() => null);

    const text = await getLogsWizardViewText(interaction);
    const session = await getLogsWizardSession(guildId, userId);

    if (!session) {
      return interaction.editReply(
        getMessageLayout(
          await resolveKey(
            interaction,
            "modules:module.setup.logs.messages.sessionExpired",
          ),
        ) as any,
      );
    }

    // Cancel
    if (customId === "logswz:cancel") {
      await deleteLogsWizardSession(guildId, userId);
      await releaseLogsWizardLock(guildId, userId);
      return interaction.editReply(
        getMessageLayout(
          await resolveKey(
            interaction,
            "modules:module.setup.logs.messages.cancelled",
          ),
        ) as any,
      );
    }

    // Toggle category on selection pages
    if (customId.startsWith("logswz:block:toggle:")) {
      const categoryId = customId.replace(
        "logswz:block:toggle:",
        "",
      ) as LogCategoryId;
      if (session.selectedCategories.includes(categoryId)) {
        session.selectedCategories = session.selectedCategories.filter(
          (id) => id !== categoryId,
        );
      } else {
        session.selectedCategories.push(categoryId);
      }
      await saveLogsWizardSession(session);

      const pageIndex = logCategories.findIndex((c) => c.id === categoryId);
      if (pageIndex < 6)
        return interaction.editReply(LogsSetupPage1(session, text) as any);
      if (pageIndex < 12)
        return interaction.editReply(LogsSetupPage2(session, text) as any);
      return interaction.editReply(LogsSetupPage3(session, text) as any);
    }

    // Page navigation
    if (customId === "logswz:step1:next") {
      session.step = 2;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupPage2(session, text) as any);
    }

    if (customId === "logswz:step2:back") {
      session.step = 1;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupPage1(session, text) as any);
    }

    if (customId === "logswz:step2:next") {
      session.step = 3;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupPage3(session, text) as any);
    }

    if (customId === "logswz:step3:back") {
      session.step = 2;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupPage2(session, text) as any);
    }

    // Finish selection → show config page
    if (customId === "logswz:step3:next") {
      session.step = 4;
      session.configPageIndex = 0;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupConfigPage(session, text) as any);
    }

    // Config page → back to selection
    if (customId === "logswz:config:back") {
      session.step = 3;
      session.configPageIndex = 0;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupPage3(session, text) as any);
    }

    // Config page pagination
    if (customId === "logswz:configpage:prev") {
      session.configPageIndex = Math.max(0, (session.configPageIndex ?? 0) - 1);
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupConfigPage(session, text) as any);
    }

    if (customId === "logswz:configpage:next") {
      session.configPageIndex = (session.configPageIndex ?? 0) + 1;
      await saveLogsWizardSession(session);
      return interaction.editReply(LogsSetupConfigPage(session, text) as any);
    }

    // Open block configuration
    if (customId.startsWith("logswz:config:")) {
      const categoryId = customId.replace(
        "logswz:config:",
        "",
      ) as LogCategoryId;
      session.activeConfigBlock = categoryId;
      session.mainMessageId = interaction.message.id;
      await saveLogsWizardSession(session);

      const block = session.blocks[categoryId];
      return interaction.followUp({
        ...LogsSetupBlockConfig(categoryId, block, text),
        ephemeral: false,
      });
    }

    // Cancel block configuration
    if (customId === "logswz:block:cancel") {
      return interaction.message.delete().catch(() => null);
    }

    // Done block configuration
    if (customId === "logswz:block:done") {
      await interaction.message.delete().catch(() => null);

      if (session.mainMessageId && interaction.channel) {
        const mainMessage = await interaction.channel.messages
          .fetch(session.mainMessageId)
          .catch(() => null);
        if (mainMessage) {
          await mainMessage
            .edit(LogsSetupConfigPage(session, text) as any)
            .catch(() => null);
        }
      }
      return;
    }

    // Auto-create channel toggle
    if (customId === "logswz:event:auto") {
      const categoryId = session.activeConfigBlock;
      if (!categoryId) return;

      const block = session.blocks[categoryId] ?? {
        channelId: null,
        autoCreate: false,
        enabledEvents: [
          ...(logEventsByCategory.get(categoryId) ?? []).map((e) => e.id),
        ],
      };

      block.autoCreate = !block.autoCreate;
      if (block.autoCreate) block.channelId = null;
      session.blocks[categoryId] = block;
      await saveLogsWizardSession(session);

      return interaction.editReply(
        LogsSetupBlockConfig(categoryId, block, text) as any,
      );
    }

    // Apply from config page
    if (customId === "logswz:configpage:apply") {
      return interaction.editReply(LogsSetupReview(session, text) as any);
    }

    // Review cancel
    if (customId === "logswz:review:cancel") {
      return interaction.editReply(LogsSetupConfigPage(session, text) as any);
    }

    // Review apply
    if (customId === "logswz:review:apply") {
      const loadingLayout = applyLoadingState(LogsSetupReview(session, text));
      await interaction.editReply(loadingLayout as any);

      if (!interaction.guild) {
        return interaction.editReply(
          getMessageLayout(
            await resolveKey(
              interaction,
              "modules:module.setup.logs.messages.guildMissing",
            ),
          ) as any,
        );
      }

      const { ensureLogsRootCategory, autoProvisionCategoryEvents } =
        await import("../lib/logging/channelProvisioning");
      const rootCategory = await ensureLogsRootCategory(interaction.guild);
      const eventChannels: Record<string, string> = {};

      for (const categoryId of session.selectedCategories) {
        const block = session.blocks[categoryId];
        if (!block) continue;

        if (block.autoCreate) {
          const mapped = await autoProvisionCategoryEvents(
            interaction.guild,
            categoryId,
            rootCategory.id,
          );
          Object.assign(eventChannels, mapped);
        } else if (block.channelId) {
          const events = logEventsByCategory.get(categoryId) ?? [];
          for (const event of events) {
            if (block.enabledEvents.includes(event.id)) {
              eventChannels[event.id] = block.channelId;
            }
          }
        }
      }

      await setLogsGuildConfig(guildId, {
        enabled: true,
        enabledCategories: session.selectedCategories,
        eventChannels,
        updatedAt: Date.now(),
      });

      await deleteLogsWizardSession(guildId, userId);
      await releaseLogsWizardLock(guildId, userId);

      const successMsg = await resolveKey(
        interaction,
        "modules:module.setup.logs.messages.autoApplied",
        {
          count: Object.keys(eventChannels).length,
          categories: session.selectedCategories.length,
        },
      );
      return interaction.editReply(getMessageLayout(successMsg) as any);
    }
  }
}
