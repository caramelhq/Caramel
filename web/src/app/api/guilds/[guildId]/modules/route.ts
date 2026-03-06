import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGuildCache } from "@/lib/cache";
import { DEV_BYPASS, DEV_MODULES } from "@/lib/dev";

export async function GET(_req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  if (DEV_BYPASS) return NextResponse.json(DEV_MODULES);

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [config, modActions7d, activeMutes, activeSilentBans] = await Promise.all([
      prisma.guildConfig.findUnique({ where: { guildId } }),
      prisma.modLog.count({
        where: { guildId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.activeMute.count({ where: { guildId } }),
      prisma.silentBan.count({ where: { guildId } }),
    ]);

    const modBans = await prisma.modLog.count({
      where: { guildId, action: "ban", createdAt: { gte: sevenDaysAgo } },
    });

    const modules = [
      {
        id: "moderation",
        name: "Moderation",
        description:
          "Full moderation suite -- warn, mute, ban, kick, timeout, lockdown, and more. Supports both slash commands and prefix.",
        enabled: config?.modModule ?? false,
        configured: !!(config?.modLogChannelId && config?.mutedRoleId),
        stats: [
          { label: "Actions (7d)", value: String(modActions7d) },
          { label: "Active mutes", value: String(activeMutes) },
          { label: "Bans (7d)", value: String(modBans) },
        ],
      },
      {
        id: "vanity-tracker",
        name: "Vanity Tracker",
        description:
          "Detects custom status keywords and automatically assigns or removes roles. Jobs processed asynchronously via BullMQ.",
        enabled: config?.vanityModule ?? false,
        configured: !!(config?.vanityString && config?.vanityRoleId),
        stats: [
          { label: "Keyword", value: config?.vanityString ?? "Not set" },
          { label: "Role ID", value: config?.vanityRoleId ? "Configured" : "Not set" },
          { label: "Channel", value: config?.vanityChannelId ? "Configured" : "Not set" },
        ],
      },
      {
        id: "silent-ban",
        name: "Silent Ban",
        description:
          "Silently restricts users from sending messages or joining voice without notifying them. Rate-limit escalation with progressive timeouts.",
        enabled: config?.modModule ?? false,
        configured: !!(config?.modLogChannelId),
        stats: [
          { label: "Active bans", value: String(activeSilentBans) },
          { label: "Log channel", value: config?.modLogChannelId ? "Configured" : "Not set" },
          { label: "Status", value: config?.modModule ? "Active" : "Inactive" },
        ],
      },
      {
        id: "auto-mute-restore",
        name: "Auto-Mute Restore",
        description:
          "Reapplies active mutes on rejoin with automatic expiry via background worker. Never miss a mute evasion.",
        enabled: config?.modModule ?? false,
        configured: !!(config?.mutedRoleId),
        stats: [
          { label: "Active mutes", value: String(activeMutes) },
          { label: "Muted role", value: config?.mutedRoleId ? "Configured" : "Not set" },
          { label: "Status", value: config?.modModule ? "Active" : "Inactive" },
        ],
      },
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Failed to fetch modules:", err);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  if (DEV_BYPASS) return NextResponse.json({ success: true });

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  const body = await req.json();
  const { moduleId, enabled } = body;

  if (typeof enabled !== "boolean" || !moduleId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const fieldMap: Record<string, string> = {
      moderation: "modModule",
      "vanity-tracker": "vanityModule",
    };

    const field = fieldMap[moduleId];
    if (!field) {
      return NextResponse.json({ error: "Unknown module" }, { status: 400 });
    }

    const updated = await prisma.guildConfig.upsert({
      where: { guildId },
      update: { [field]: enabled },
      create: { guildId, [field]: enabled },
    });
    await syncGuildCache(guildId, updated);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update module:", err);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}
