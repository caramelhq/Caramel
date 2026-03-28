import { resolveKey } from "@sapphire/plugin-i18next";
import type { LogsWizardViewText } from "./logsSetupView";

export async function getLogsWizardViewText(
  target: any,
): Promise<LogsWizardViewText> {
  return {
    page1: {
      title: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page1.title",
      ),
      selectBlocks: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page1.selectBlocks",
      ),
      cancel: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page1.cancel",
      ),
      continue: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page1.continue",
      ),
    },
    page2: {
      selectBlocks: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page2.selectBlocks",
      ),
      back: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page2.back",
      ),
      continue: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page2.continue",
      ),
    },
    page3: {
      selectBlocks: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page3.selectBlocks",
      ),
      back: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page3.back",
      ),
      finish: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.page3.finish",
      ),
    },
    blockConfig: {
      selectEvents: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.blockConfig.selectEvents",
      ),
      autoCreate: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.blockConfig.autoCreate",
      ),
      selectChannel: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.blockConfig.selectChannel",
      ),
      cancel: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.blockConfig.cancel",
      ),
      customizing: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.blockConfig.customizing",
      ),
      done: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.blockConfig.done",
      ),
    },
    review: {
      title: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.title",
      ),
      description: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.description",
      ),
      selectedBlocks: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.selectedBlocks",
      ),
      channelsToCreate: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.channelsToCreate",
      ),
      totalEvents: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.totalEvents",
      ),
      cancel: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.cancel",
      ),
      apply: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.apply",
      ),
      autoCreate: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.autoCreate",
      ),
      existing: await resolveKey(
        target,
        "modules:module.setup.logs.wizard.review.existing",
      ),
    },
  };
}
