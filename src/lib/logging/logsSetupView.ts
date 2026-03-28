import { logCategories, logEventsByCategory } from "./catalog";
import { LogBlockConfig, LogCategoryId, LogsWizardSession } from "./types";
import {
  ActionRowComponent,
  ButtonComponent,
  ChannelSelectComponent,
  ContainerComponent,
  SectionComponent,
  SeparatorComponent,
  StringSelectComponent,
  TextDisplayComponent,
} from "../layouts/ui";

const CHECK_EMOJI = { name: "white_check_mark", id: "1486539433321693265" };
const CROSS_EMOJI = { name: "white_cross_mark", id: "1486539981508841523" };
const CONFIG_EMOJI = { name: "configuration", id: "1485101086867062935" };
const CREATE_CHANNEL_EMOJI = {
  name: "create_channel",
  id: "1486582768698654790",
};

export type LogsWizardViewText = {
  page1: {
    title: string;
    selectBlocks: string;
    cancel: string;
    continue: string;
  };
  page2: {
    selectBlocks: string;
    back: string;
    continue: string;
  };
  page3: {
    selectBlocks: string;
    back: string;
    finish: string;
  };
  blockConfig: {
    selectEvents: string;
    autoCreate: string;
    selectChannel: string;
    cancel: string;
    customizing: string;
    done: string;
  };
  review: {
    title: string;
    description: string;
    selectedBlocks: string;
    channelsToCreate: string;
    totalEvents: string;
    cancel: string;
    apply: string;
    autoCreate: string;
    existing: string;
  };
};

function buildCategorySections(
  categories: typeof logCategories,
  session: LogsWizardSession,
) {
  return categories.map((category) => {
    const active = session.selectedCategories.includes(category.id);
    return SectionComponent(
      [TextDisplayComponent(`**${category.title}**`)],
      ButtonComponent(
        `logswz:block:toggle:${category.id}`,
        "",
        active ? 1 : 2,
        active ? CHECK_EMOJI : CROSS_EMOJI,
      ),
    );
  });
}

function buildConfigSections(
  categories: typeof logCategories,
  session: LogsWizardSession,
) {
  return categories.map((category) => {
    const block = session.blocks[category.id];
    const isConfigured = block && block.enabledEvents.length > 0;
    return SectionComponent(
      [TextDisplayComponent(`**${category.title}**`)],
      ButtonComponent(
        `logswz:config:${category.id}`,
        "",
        isConfigured ? 1 : 2,
        isConfigured ? CHECK_EMOJI : CONFIG_EMOJI,
      ),
    );
  });
}

// ─────────────────────────────────────────────────────────────
// Page 1: First 6 Categories
// ─────────────────────────────────────────────────────────────

export function LogsSetupPage1(
  session: LogsWizardSession,
  text: LogsWizardViewText,
) {
  const pageCategories = logCategories.slice(0, 6);

  return {
    flags: 32768,
    components: [
      ContainerComponent([
        TextDisplayComponent(
          `## ${text.page1.title}\n${text.page1.selectBlocks}`,
        ),
        ...buildCategorySections(pageCategories, session),
        SeparatorComponent(2),
        ActionRowComponent([
          ButtonComponent("logswz:cancel", text.page1.cancel, 4),
          ButtonComponent("logswz:page:1", "1/3", 2, undefined, true),
          ButtonComponent("logswz:step1:next", text.page1.continue, 2),
        ]),
      ]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Page 2: Next 6 Categories
// ─────────────────────────────────────────────────────────────

export function LogsSetupPage2(
  session: LogsWizardSession,
  text: LogsWizardViewText,
) {
  const pageCategories = logCategories.slice(6, 12);

  return {
    flags: 32768,
    components: [
      ContainerComponent([
        TextDisplayComponent(
          `## ${text.page1.title}\n${text.page2.selectBlocks}`,
        ),
        ...buildCategorySections(pageCategories, session),
        SeparatorComponent(2),
        ActionRowComponent([
          ButtonComponent("logswz:step2:back", text.page2.back, 2),
          ButtonComponent("logswz:page:2", "2/3", 2, undefined, true),
          ButtonComponent("logswz:step2:next", text.page2.continue, 2),
        ]),
      ]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Page 3: Last 6 Categories + Finish
// ─────────────────────────────────────────────────────────────

export function LogsSetupPage3(
  session: LogsWizardSession,
  text: LogsWizardViewText,
) {
  const pageCategories = logCategories.slice(12);

  return {
    flags: 32768,
    components: [
      ContainerComponent([
        TextDisplayComponent(
          `## ${text.page1.title}\n${text.page3.selectBlocks}`,
        ),
        ...buildCategorySections(pageCategories, session),
        SeparatorComponent(2),
        ActionRowComponent([
          ButtonComponent("logswz:step3:back", text.page3.back, 2),
          ButtonComponent("logswz:page:3", "3/3", 2, undefined, true),
          ButtonComponent("logswz:step3:next", text.page3.finish, 3),
        ]),
      ]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Config Page: Customize selected blocks
// ─────────────────────────────────────────────────────────────

export function LogsSetupConfigPage(
  session: LogsWizardSession,
  text: LogsWizardViewText,
) {
  const activeCategories = logCategories.filter((c) =>
    session.selectedCategories.includes(c.id),
  );

  return {
    flags: 32768,
    components: [
      ContainerComponent([
        TextDisplayComponent("Customize your logs:"),
        SeparatorComponent(1),
        ...buildConfigSections(activeCategories, session),
        SeparatorComponent(1),
        ActionRowComponent([
          ButtonComponent("logswz:config:back", text.blockConfig.cancel, 2),
          ButtonComponent(
            "logswz:configpage:apply",
            text.review.apply,
            3,
            undefined,
            activeCategories.some(
              (c) =>
                !session.blocks[c.id] ||
                session.blocks[c.id]!.enabledEvents.length === 0,
            ),
          ),
        ]),
      ]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Block Configuration (opens as new message)
// ─────────────────────────────────────────────────────────────

export function LogsSetupBlockConfig(
  categoryId: LogCategoryId,
  block: LogBlockConfig | undefined,
  text: LogsWizardViewText,
) {
  const category = logCategories.find((c) => c.id === categoryId);
  const events = logEventsByCategory.get(categoryId) ?? [];

  const eventOptions = events.slice(0, 25).map((event) => ({
    label: event.title,
    value: event.id,
    default: !block || block.enabledEvents.includes(event.id),
  }));

  const hasEvents = eventOptions.length > 0;
  const selectMinValues = hasEvents ? 1 : 0;
  const selectMaxValues = hasEvents ? eventOptions.length : 0;

  const selectRow = hasEvents
    ? [
        ActionRowComponent([
          StringSelectComponent(
            "logswz:event:select",
            eventOptions,
            "Select events to log ▾",
            selectMinValues,
            selectMaxValues,
          ),
        ]),
      ]
    : [TextDisplayComponent("No events available for this category.")];

  return {
    flags: 32768,
    components: [
      ContainerComponent([
        TextDisplayComponent(text.blockConfig.selectEvents),
        ...selectRow,
        SeparatorComponent(2, true),
        SectionComponent(
          [TextDisplayComponent(text.blockConfig.autoCreate)],
          ButtonComponent(
            "logswz:event:auto",
            "",
            block?.autoCreate ? 1 : 2,
            block?.autoCreate ? CHECK_EMOJI : CREATE_CHANNEL_EMOJI,
          ),
        ),
        TextDisplayComponent(""),
        ActionRowComponent([
          ChannelSelectComponent(
            "logswz:channel",
            text.blockConfig.selectChannel,
            [0],
            1,
            1,
            block?.channelId
              ? [{ id: block.channelId, type: "channel" }]
              : undefined,
          ),
        ]),
        SeparatorComponent(1),
        ActionRowComponent([
          ButtonComponent("logswz:block:cancel", text.blockConfig.cancel, 2),
          ButtonComponent(
            "logswz:block:customizing",
            text.blockConfig.customizing.replace(
              "{{block}}",
              category?.title ?? categoryId,
            ),
            2,
            undefined,
            true,
          ),
          ButtonComponent("logswz:block:done", text.blockConfig.done, 2),
        ]),
      ]),
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// Review / Summary
// ─────────────────────────────────────────────────────────────

export function LogsSetupReview(
  session: LogsWizardSession,
  text: LogsWizardViewText,
) {
  const activeCategories = logCategories.filter((c) =>
    session.selectedCategories.includes(c.id),
  );

  const channelsToCreate = activeCategories.filter(
    (c) => session.blocks[c.id]?.autoCreate,
  ).length;

  const totalEvents = activeCategories.reduce(
    (sum, c) => sum + (session.blocks[c.id]?.enabledEvents.length ?? 0),
    0,
  );

  const headerText = `## ${
    text.review.title
  }\n\n${text.review.description.replace(
    "{{bot}}",
    `<@${session.userId}>`,
  )}\n\n**${text.review.selectedBlocks}:** \`${activeCategories.length}\`\n**${
    text.review.channelsToCreate
  }:** \`${channelsToCreate}\`\n**${
    text.review.totalEvents
  }:** \`${totalEvents}\`\n`;

  const blockLines = activeCategories.map((category) => {
    const block = session.blocks[category.id];
    if (!block) return `**${category.title}**\n-# No configuration`;

    const channelInfo = block.autoCreate
      ? `#${category.id}-log (${text.review.autoCreate})`
      : block.channelId
        ? `<#${block.channelId}> (${text.review.existing})`
        : "No channel";

    const eventNames = block.enabledEvents.map((e) => `\`${e}\``).join(" ");
    return `**${category.title}** - ${channelInfo}\n-# ${eventNames}`;
  });

  return {
    flags: 32768,
    components: [
      ContainerComponent(
        [
          TextDisplayComponent(headerText),
          ...blockLines
            .map((line) => [SeparatorComponent(), TextDisplayComponent(line)])
            .flat(),
          SeparatorComponent(),
          ActionRowComponent([
            ButtonComponent("logswz:review:cancel", text.review.cancel, 2),
            ButtonComponent("logswz:review:apply", text.review.apply, 1),
          ]),
        ],
        14120277,
      ),
    ],
  };
}
