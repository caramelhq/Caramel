const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  approximate_member_count?: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

const MANAGE_GUILD = BigInt(0x20);
const ADMINISTRATOR = BigInt(0x8);

export function hasManageGuild(permissions: string): boolean {
  const perms = BigInt(permissions);
  return (perms & MANAGE_GUILD) === MANAGE_GUILD || (perms & ADMINISTRATOR) === ADMINISTRATOR;
}

export async function fetchUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds?with_counts=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
  return res.json();
}

export async function fetchBotGuilds(): Promise<Set<string>> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return new Set();

  const guilds: DiscordGuild[] = [];
  let after: string | undefined;

  while (true) {
    const url = new URL(`${DISCORD_API}/users/@me/guilds`);
    url.searchParams.set("limit", "200");
    if (after) url.searchParams.set("after", after);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) break;

    const batch: DiscordGuild[] = await res.json();
    guilds.push(...batch);
    if (batch.length < 200) break;
    after = batch[batch.length - 1].id;
  }

  return new Set(guilds.map((g) => g.id));
}

export async function fetchGuildFromBot(guildId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGuildChannels(guildId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return [];

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchGuildRoles(guildId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return [];

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchUser(userId: string): Promise<DiscordUser | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;

  const res = await fetch(`${DISCORD_API}/users/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function resolveUsernames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  const results = await Promise.allSettled(unique.map((id) => fetchUser(id)));
  const map = new Map<string, string>();

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value) {
      const u = result.value;
      map.set(unique[i], u.global_name ?? u.username);
    }
  });

  return map;
}

// Channel type 0 = GuildText, permission overwrite type 0 = role
const VIEW_CHANNEL = "1024";

export async function createPrivateChannel(guildId: string, name: string): Promise<{ id: string; name: string } | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;

  const guild = await fetchGuildFromBot(guildId);
  if (!guild) return null;

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      type: 0,
      permission_overwrites: [
        { id: guild.id, type: 0, deny: VIEW_CHANNEL },
      ],
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createRole(
  guildId: string,
  name: string,
  color?: number,
  reason?: string,
): Promise<{ id: string; name: string } | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;

  const headers: Record<string, string> = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
  if (reason) headers["X-Audit-Log-Reason"] = reason;

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, color: color ?? 0 }),
  });
  if (!res.ok) return null;
  return res.json();
}

export function guildIconUrl(guildId: string, iconHash: string | null, size = 128): string | null {
  if (!iconHash) return null;
  const ext = iconHash.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
}
