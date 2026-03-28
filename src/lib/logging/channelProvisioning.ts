import { Guild, ChannelType, PermissionsBitField } from "discord.js";
import { logEventsByCategory, getLogEventDefinition } from "./catalog";
import { LogCategoryId } from "./types";

function normalizeChannelName(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

export async function ensureLogsRootCategory(guild: Guild) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === "caramel-logs",
  );
  if (existing) return existing;

  return guild.channels.create({
    name: "caramel-logs",
    type: ChannelType.GuildCategory,
    reason: "Caramel logs setup: root category",
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: guild.client.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  });
}

export async function ensureCategoryChannel(
  guild: Guild,
  categoryId: LogCategoryId,
  parentId: string,
) {
  const channelName = normalizeChannelName(`logs-${categoryId}`);
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === parentId &&
      channel.name === channelName,
  );

  if (existing && existing.type === ChannelType.GuildText) return existing;

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    topic: `Caramel logs channel for ${categoryId}`,
    reason: `Caramel logs setup: ${categoryId}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel],
      },
    ],
  });
}

export async function ensureEventChannel(
  guild: Guild,
  eventId: string,
  parentId: string,
) {
  const eventDef = getLogEventDefinition(eventId);
  const channelName = normalizeChannelName(`log-${eventDef?.id ?? eventId}`);

  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === parentId &&
      channel.name === channelName,
  );

  if (existing && existing.type === ChannelType.GuildText) return existing;

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    topic: `Caramel logs channel for ${eventId}`,
    reason: `Caramel logs setup: ${eventId}`,
  });
}

export function getAutoGroupKey(eventId: string) {
  if (eventId.startsWith("sticker")) return "stickers";
  if (eventId.startsWith("emoji")) return "emojis";
  if (eventId.startsWith("role")) return "roles";
  if (eventId.startsWith("channel")) return "channels";
  if (eventId.startsWith("webhook")) return "webhooks";
  if (eventId.startsWith("invite") || eventId === "invitePost")
    return "invites";
  if (eventId.startsWith("autoModeration")) return "automod";
  if (
    eventId.startsWith("guildMember") ||
    eventId.startsWith("guildBan") ||
    eventId === "userUpdate"
  )
    return "members";
  if (eventId.startsWith("message")) return "messages";
  if (eventId.startsWith("poll")) return "polls";
  if (eventId.startsWith("soundboardSound")) return "soundboard";
  if (eventId.startsWith("thread")) return "threads";
  if (eventId.startsWith("stageInstance")) return "stages";
  if (eventId.startsWith("voice")) return "voice";
  if (eventId.startsWith("guildScheduledEvent")) return "scheduled-events";
  if (eventId === "applicationCommandPermissionsUpdate")
    return "command-permissions";
  if (eventId === "onboardingUpdate") return "onboarding";
  if (eventId === "guildUpdate") return "guild";
  return eventId;
}

async function ensureGroupedEventChannel(
  guild: Guild,
  groupKey: string,
  parentId: string,
) {
  const channelName = normalizeChannelName(`log-${groupKey}`);
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === parentId &&
      channel.name === channelName,
  );

  if (existing && existing.type === ChannelType.GuildText) return existing;

  return guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId,
    topic: `Caramel grouped logs channel for ${groupKey}`,
    reason: `Caramel logs setup (grouped): ${groupKey}`,
  });
}

export async function autoProvisionCategoryEvents(
  guild: Guild,
  categoryId: LogCategoryId,
  parentId: string,
) {
  const eventDefs = logEventsByCategory.get(categoryId) ?? [];
  const eventChannelMap: Record<string, string> = {};
  const groupedChannelIds: Record<string, string> = {};

  for (const eventDef of eventDefs) {
    const groupKey = getAutoGroupKey(eventDef.id);

    if (!groupedChannelIds[groupKey]) {
      const groupedChannel = await ensureGroupedEventChannel(
        guild,
        groupKey,
        parentId,
      );
      groupedChannelIds[groupKey] = groupedChannel.id;
    }

    eventChannelMap[eventDef.id] = groupedChannelIds[groupKey];
  }

  return eventChannelMap;
}
