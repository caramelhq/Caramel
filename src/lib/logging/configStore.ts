import { container } from "@sapphire/framework";
import { logCategories } from "./catalog";
import { LogCategoryId, LogsGuildConfig } from "./types";

const configKey = (guildId: string) => `logs:config:${guildId}`;

function getDefaultConfig(): LogsGuildConfig {
  return {
    enabled: true,
    enabledCategories: logCategories.map((category) => category.id),
    eventChannels: {},
    updatedAt: Date.now(),
  };
}

export async function getLogsGuildConfig(
  guildId: string,
): Promise<LogsGuildConfig> {
  const raw = await container.redis.get(configKey(guildId));
  if (!raw) return getDefaultConfig();

  try {
    const parsed = JSON.parse(raw) as LogsGuildConfig;
    return {
      ...getDefaultConfig(),
      ...parsed,
      enabledCategories:
        parsed.enabledCategories ?? getDefaultConfig().enabledCategories,
      eventChannels: parsed.eventChannels ?? {},
    };
  } catch {
    return getDefaultConfig();
  }
}

export async function setLogsGuildConfig(
  guildId: string,
  config: LogsGuildConfig,
) {
  const payload: LogsGuildConfig = {
    ...config,
    updatedAt: Date.now(),
  };
  await container.redis.set(configKey(guildId), JSON.stringify(payload));
}

export function isLogsConfigReady(config: LogsGuildConfig) {
  return (
    config.enabledCategories.length > 0 &&
    Object.keys(config.eventChannels).length > 0
  );
}

export async function resetLogsGuildConfig(guildId: string) {
  await container.redis.del(configKey(guildId));
}
