export type LogCategoryId =
  | "invites"
  | "automod"
  | "members"
  | "server"
  | "command-permissions"
  | "roles"
  | "channels"
  | "emojis"
  | "stickers"
  | "webhooks"
  | "onboarding"
  | "messages"
  | "polls"
  | "soundboard"
  | "threads"
  | "stages"
  | "voice"
  | "scheduled-events";

export type LogEventDefinition = {
  id: string;
  category: LogCategoryId;
  title: string;
  highVolume?: boolean;
};

export type LogCategoryDefinition = {
  id: LogCategoryId;
  title: string;
  description: string;
};

export type LogBlockConfig = {
  channelId: string | null;
  autoCreate: boolean;
  enabledEvents: string[];
};

export type LogsGuildConfig = {
  enabled: boolean;
  enabledCategories: LogCategoryId[];
  eventChannels: Record<string, string>;
  updatedAt: number;
};

export type LogsWizardSession = {
  guildId: string;
  userId: string;
  step: 1 | 2 | 3 | 4;
  selectedCategories: LogCategoryId[];
  blocks: Partial<Record<LogCategoryId, LogBlockConfig>>;
  activeConfigBlock: LogCategoryId | null;
  mainMessageId: string | null;
  configPageIndex?: number;
  createdAt: number;
  updatedAt: number;
};

export type EmitLogPayload = {
  title: string;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
};
