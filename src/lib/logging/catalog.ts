import {
  LogCategoryDefinition,
  LogCategoryId,
  LogEventDefinition,
} from "./types";

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
  if (eventId === "guildUpdate") return "server";
  return eventId;
}

export function computeAutoChannels(
  categories: LogCategoryId[],
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const categoryId of categories) {
    const events = logEventsByCategory.get(categoryId) ?? [];
    for (const event of events) {
      const key = getAutoGroupKey(event.id);
      const list = grouped.get(key) ?? [];
      list.push(event.id);
      grouped.set(key, list);
    }
  }

  return grouped;
}

export const logCategories: LogCategoryDefinition[] = [
  {
    id: "invites",
    title: "Invites",
    description: "Invite creation, deletion and posting",
  },
  {
    id: "automod",
    title: "AutoMod",
    description: "AutoMod rules and actions",
  },
  {
    id: "members",
    title: "Members",
    description: "Member lifecycle and profile changes",
  },
  {
    id: "server",
    title: "Server",
    description: "Guild and structure changes",
  },
  {
    id: "command-permissions",
    title: "Command Permissions",
    description: "Slash command permission updates",
  },
  {
    id: "roles",
    title: "Roles",
    description: "Role creation, updates and deletion",
  },
  {
    id: "channels",
    title: "Channels",
    description: "Channel creation, updates, deletion and pins",
  },
  {
    id: "emojis",
    title: "Emojis",
    description: "Emoji creation, updates and deletion",
  },
  {
    id: "stickers",
    title: "Stickers",
    description: "Sticker creation, updates and deletion",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Webhook creation, updates and deletion",
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Server onboarding updates",
  },
  {
    id: "messages",
    title: "Messages",
    description: "Message edits, deletes and publication events",
  },
  {
    id: "polls",
    title: "Polls",
    description: "Poll creation, votes and finalization",
  },
  {
    id: "soundboard",
    title: "Soundboard",
    description: "Soundboard uploads and updates",
  },
  {
    id: "threads",
    title: "Threads",
    description: "Thread lifecycle and updates",
  },
  {
    id: "stages",
    title: "Stages",
    description: "Stage instance lifecycle and edits",
  },
  {
    id: "voice",
    title: "Voice",
    description: "Voice channel movement and state changes",
  },
  {
    id: "scheduled-events",
    title: "Scheduled Events",
    description: "Guild scheduled event lifecycle and RSVPs",
  },
];

export const logEvents: LogEventDefinition[] = [
  // Invites
  { id: "inviteCreate", category: "invites", title: "Invite Created" },
  { id: "inviteDelete", category: "invites", title: "Invite Deleted" },
  { id: "invitePost", category: "invites", title: "Invite Posted" },

  // AutoMod
  {
    id: "autoModerationRuleCreate",
    category: "automod",
    title: "AutoMod Rule Created",
  },
  {
    id: "autoModerationRuleUpdate",
    category: "automod",
    title: "AutoMod Rule Updated",
  },
  {
    id: "autoModerationRuleDelete",
    category: "automod",
    title: "AutoMod Rule Deleted",
  },
  {
    id: "autoModerationActionExecution",
    category: "automod",
    title: "AutoMod Action Executed",
    highVolume: true,
  },

  // Members
  { id: "guildMemberAdd", category: "members", title: "Member Joined" },
  {
    id: "guildMemberRemove",
    category: "members",
    title: "Member Left/Removed",
  },
  { id: "guildMemberUpdate", category: "members", title: "Member Updated" },
  { id: "guildBanAdd", category: "members", title: "Member Banned" },
  { id: "guildBanRemove", category: "members", title: "Member Unbanned" },
  { id: "userUpdate", category: "members", title: "User Updated" },
  { id: "guildMemberPrune", category: "members", title: "Members Pruned" },

  // Server
  { id: "guildUpdate", category: "server", title: "Guild Updated" },

  // Command Permissions
  {
    id: "applicationCommandPermissionsUpdate",
    category: "command-permissions",
    title: "Slash Command Permissions Updated",
  },

  // Roles
  { id: "roleCreate", category: "roles", title: "Role Created" },
  { id: "roleUpdate", category: "roles", title: "Role Updated" },
  { id: "roleDelete", category: "roles", title: "Role Deleted" },

  // Channels
  { id: "channelCreate", category: "channels", title: "Channel Created" },
  { id: "channelDelete", category: "channels", title: "Channel Deleted" },
  {
    id: "channelPinsUpdate",
    category: "channels",
    title: "Channel Pins Updated",
  },
  {
    id: "channelPermissionsUpdate",
    category: "channels",
    title: "Channel Permissions Updated",
  },
  { id: "channelUpdate", category: "channels", title: "Channel Updated" },

  // Emojis
  { id: "emojiCreate", category: "emojis", title: "Emoji Created" },
  { id: "emojiUpdate", category: "emojis", title: "Emoji Updated" },
  { id: "emojiDelete", category: "emojis", title: "Emoji Deleted" },

  // Stickers
  { id: "stickerCreate", category: "stickers", title: "Sticker Created" },
  { id: "stickerUpdate", category: "stickers", title: "Sticker Updated" },
  { id: "stickerDelete", category: "stickers", title: "Sticker Deleted" },

  // Webhooks
  { id: "webhookCreate", category: "webhooks", title: "Webhook Created" },
  { id: "webhookUpdate", category: "webhooks", title: "Webhook Updated" },
  { id: "webhookDelete", category: "webhooks", title: "Webhook Deleted" },

  // Onboarding
  {
    id: "onboardingUpdate",
    category: "onboarding",
    title: "Onboarding Updated",
  },

  // Messages
  {
    id: "messageDelete",
    category: "messages",
    title: "Message Deleted",
    highVolume: true,
  },
  {
    id: "messageUpdate",
    category: "messages",
    title: "Message Updated",
    highVolume: true,
  },
  {
    id: "messageDeleteBulk",
    category: "messages",
    title: "Bulk Message Delete",
  },
  { id: "messagePublish", category: "messages", title: "Message Published" },
  {
    id: "messageSentUsingCommand",
    category: "messages",
    title: "Message Sent via Command",
  },

  // Polls
  { id: "pollCreate", category: "polls", title: "Poll Created" },
  { id: "pollDelete", category: "polls", title: "Poll Deleted" },
  { id: "pollFinalize", category: "polls", title: "Poll Finalized" },
  { id: "pollVotesAdd", category: "polls", title: "Poll Vote Added" },
  { id: "pollVotesRemove", category: "polls", title: "Poll Vote Removed" },

  // Soundboard
  {
    id: "soundboardSoundUpload",
    category: "soundboard",
    title: "Soundboard Sound Uploaded",
  },
  {
    id: "soundboardSoundNameUpdate",
    category: "soundboard",
    title: "Soundboard Sound Renamed",
  },
  {
    id: "soundboardSoundVolumeUpdate",
    category: "soundboard",
    title: "Soundboard Sound Volume Updated",
  },
  {
    id: "soundboardSoundEmojiUpdate",
    category: "soundboard",
    title: "Soundboard Sound Emoji Updated",
  },
  {
    id: "soundboardSoundDelete",
    category: "soundboard",
    title: "Soundboard Sound Deleted",
  },

  // Threads
  { id: "threadCreate", category: "threads", title: "Thread Created" },
  { id: "threadDelete", category: "threads", title: "Thread Deleted" },
  { id: "threadUpdate", category: "threads", title: "Thread Updated" },

  // Stages
  { id: "stageInstanceCreate", category: "stages", title: "Stage Started" },
  { id: "stageInstanceUpdate", category: "stages", title: "Stage Updated" },
  { id: "stageInstanceDelete", category: "stages", title: "Stage Ended" },

  // Voice
  {
    id: "voiceUserUpdate",
    category: "voice",
    title: "Voice User Movement",
    highVolume: true,
  },
  {
    id: "voiceStateUpdate",
    category: "voice",
    title: "Voice State Updated",
    highVolume: true,
  },

  // Scheduled Events
  {
    id: "guildScheduledEventCreate",
    category: "scheduled-events",
    title: "Scheduled Event Created",
  },
  {
    id: "guildScheduledEventUpdate",
    category: "scheduled-events",
    title: "Scheduled Event Updated",
  },
  {
    id: "guildScheduledEventDelete",
    category: "scheduled-events",
    title: "Scheduled Event Deleted",
  },
  {
    id: "guildScheduledEventUserAdd",
    category: "scheduled-events",
    title: "Scheduled Event RSVP Added",
  },
  {
    id: "guildScheduledEventUserRemove",
    category: "scheduled-events",
    title: "Scheduled Event RSVP Removed",
  },
];

export const logEventsByCategory = new Map(
  logCategories.map((category) => [
    category.id,
    logEvents.filter((eventDef) => eventDef.category === category.id),
  ]),
);

export function getLogEventDefinition(eventId: string) {
  return logEvents.find((eventDef) => eventDef.id === eventId) ?? null;
}
