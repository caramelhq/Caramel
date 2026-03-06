export const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === "true";

export const DEV_GUILDS = [
  {
    id: "927361845012",
    name: "Caramel HQ",
    icon: null,
    memberCount: 4521,
    modulesEnabled: 2,
    modulesTotal: 2,
  },
  {
    id: "831204756123",
    name: "Gaming Lounge",
    icon: null,
    memberCount: 1234,
    modulesEnabled: 1,
    modulesTotal: 2,
  },
  {
    id: "745098321456",
    name: "Study Group",
    icon: null,
    memberCount: 312,
    modulesEnabled: 0,
    modulesTotal: 2,
  },
];

export const DEV_STATS = {
  memberCount: 4521,
  modulesEnabled: 2,
  modulesTotal: 2,
  modActions7d: 47,
  modActionsChange: 12,
  activeMutes: 3,
  activeSilentBans: 5,
};

export const DEV_ACTIONS = [
  { id: 1, action: "ban", userId: "348271560437325824", userName: "spammer", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Spam in #general", duration: null, createdAt: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 2, action: "mute", userId: "519283746102938475", userName: "toxic_user", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Toxicity", duration: "1h", createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 3, action: "warn", userId: "637485920183746521", userName: "newbie99", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Self-promo", duration: null, createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: 4, action: "kick", userId: "182736450918273645", userName: "raider_x", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Raid attempt", duration: null, createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 5, action: "timeout", userId: "918273645019283746", userName: "troll33", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Repeated offenses", duration: "30m", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
];

export const DEV_MODULES = [
  {
    id: "moderation",
    name: "Moderation",
    description: "Full moderation suite -- warn, mute, ban, kick, timeout, lockdown, and more.",
    enabled: true,
    configured: true,
    stats: [
      { label: "Actions (7d)", value: "47" },
      { label: "Active mutes", value: "3" },
      { label: "Bans (7d)", value: "12" },
    ],
  },
  {
    id: "vanity-tracker",
    name: "Vanity Tracker",
    description: "Detects custom status keywords and automatically assigns or removes roles via BullMQ.",
    enabled: true,
    configured: true,
    stats: [
      { label: "Keyword", value: "/caramel" },
      { label: "Role ID", value: "Configured" },
      { label: "Channel", value: "Configured" },
    ],
  },
  {
    id: "silent-ban",
    name: "Silent Ban",
    description: "Silently restricts users without notifying them. Rate-limit escalation with progressive timeouts.",
    enabled: true,
    configured: true,
    stats: [
      { label: "Active bans", value: "5" },
      { label: "Log channel", value: "Configured" },
      { label: "Status", value: "Active" },
    ],
  },
  {
    id: "auto-mute-restore",
    name: "Auto-Mute Restore",
    description: "Reapplies active mutes on rejoin with automatic expiry via background worker.",
    enabled: true,
    configured: true,
    stats: [
      { label: "Active mutes", value: "3" },
      { label: "Muted role", value: "Configured" },
      { label: "Status", value: "Active" },
    ],
  },
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DEV_ACTIVITY = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    day: d.toISOString().split("T")[0],
    label: dayLabels[d.getDay()],
    count: [8, 12, 5, 15, 3, 7, 10][i],
  };
});

export const DEV_LOGS = [
  { id: 1, action: "ban", targetId: "348271560437325824", targetName: "spammer", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Repeated spam in #general", timestamp: "2026-03-05T14:32:00Z", duration: null },
  { id: 2, action: "mute", targetId: "519283746102938475", targetName: "toxic_user", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Toxicity towards members", timestamp: "2026-03-05T14:15:00Z", duration: "1h" },
  { id: 3, action: "warn", targetId: "637485920183746521", targetName: "newbie99", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Self-promotion without permission", timestamp: "2026-03-05T13:45:00Z", duration: null },
  { id: 4, action: "kick", targetId: "182736450918273645", targetName: "raider_x", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Raid attempt detected", timestamp: "2026-03-05T11:20:00Z", duration: null },
  { id: 5, action: "timeout", targetId: "918273645019283746", targetName: "troll33", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Repeated rule violations", timestamp: "2026-03-05T09:10:00Z", duration: "30m" },
  { id: 6, action: "silentban", targetId: "456789012345678901", targetName: "evader44", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Ban evasion suspected", timestamp: "2026-03-04T22:00:00Z", duration: null },
  { id: 7, action: "softban", targetId: "567890123456789012", targetName: "spambot77", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Bot account -- clear messages", timestamp: "2026-03-04T20:15:00Z", duration: null },
  { id: 8, action: "unmute", targetId: "678901234567890123", targetName: "reformed11", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Mute expired", timestamp: "2026-03-04T18:30:00Z", duration: null },
  { id: 9, action: "lockdown", targetId: "general", targetName: "#general", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Raid in progress", timestamp: "2026-03-04T16:00:00Z", duration: null },
  { id: 10, action: "slowmode", targetId: "off-topic", targetName: "#off-topic", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "High activity", timestamp: "2026-03-04T14:45:00Z", duration: "10s" },
  { id: 11, action: "ban", targetId: "789012345678901234", targetName: "nsfw_poster", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "NSFW content in SFW channel", timestamp: "2026-03-04T12:00:00Z", duration: null },
  { id: 12, action: "warn", targetId: "890123456789012345", targetName: "caps_guy", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Excessive caps lock", timestamp: "2026-03-04T10:30:00Z", duration: null },
  { id: 13, action: "mute", targetId: "901234567890123456", targetName: "argue88", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Heated argument escalation", timestamp: "2026-03-03T23:15:00Z", duration: "2h" },
  { id: 14, action: "kick", targetId: "012345678901234567", targetName: "scammer55", moderatorId: "384756102938475612", moderatorName: "ModeratorX", reason: "Scam link posted", timestamp: "2026-03-03T21:00:00Z", duration: null },
  { id: 15, action: "timeout", targetId: "123456789012345678", targetName: "flooder03", moderatorId: "274927048843952128", moderatorName: "Admin", reason: "Message flooding", timestamp: "2026-03-03T19:45:00Z", duration: "15m" },
];

export const DEV_SETTINGS = {
  config: {
    modLogChannelId: "123456789",
    modModule: true,
    modThresholdsEnabled: true,
    mutedRoleId: "987654321",
    muteThreshold: 3,
    banThreshold: 5,
    vanityModule: true,
    vanityString: "/caramel",
    vanityRoleId: "111222333",
    vanityChannelId: "444555666",
  },
  channels: [
    { id: "123456789", name: "mod-logs" },
    { id: "444555666", name: "vanity-log" },
    { id: "777888999", name: "general" },
    { id: "101010101", name: "bot-alerts" },
    { id: "202020202", name: "off-topic" },
  ],
  roles: [
    { id: "987654321", name: "Muted", color: 0x95a5a6 },
    { id: "111222333", name: "Vanity", color: 0xd77655 },
    { id: "333444555", name: "Moderator", color: 0x3498db },
    { id: "666777888", name: "Admin", color: 0xe74c3c },
    { id: "999000111", name: "Member", color: 0x2ecc71 },
  ],
};
