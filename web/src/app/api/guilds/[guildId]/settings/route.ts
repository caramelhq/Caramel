import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGuildCache } from "@/lib/cache";
import { fetchGuildChannels, fetchGuildRoles } from "@/lib/discord";
import { DEV_BYPASS, DEV_SETTINGS } from "@/lib/dev";

export async function GET(_req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  if (DEV_BYPASS) return NextResponse.json(DEV_SETTINGS);

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;

  try {
    const [config, channels, roles] = await Promise.all([
      prisma.guildConfig.findUnique({ where: { guildId } }),
      fetchGuildChannels(guildId),
      fetchGuildRoles(guildId),
    ]);

    const textChannels = channels
      .filter((c: { type: number }) => c.type === 0)
      .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));

    const assignableRoles = roles
      .filter((r: { managed: boolean; name: string }) => !r.managed && r.name !== "@everyone")
      .map((r: { id: string; name: string; color: number }) => ({ id: r.id, name: r.name, color: r.color }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({
      config: config
        ? {
            modLogChannelId: config.modLogChannelId,
            modModule: config.modModule,
            modThresholdsEnabled: config.modThresholdsEnabled,
            mutedRoleId: config.mutedRoleId,
            muteThreshold: config.muteThreshold,
            banThreshold: config.banThreshold,
            vanityModule: config.vanityModule,
            vanityString: config.vanityString,
            vanityRoleId: config.vanityRoleId,
            vanityChannelId: config.vanityChannelId,
          }
        : null,
      channels: textChannels,
      roles: assignableRoles,
    });
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
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

  const allowedFields = [
    "modLogChannelId",
    "modThresholdsEnabled",
    "muteThreshold",
    "banThreshold",
    "mutedRoleId",
    "vanityString",
    "vanityRoleId",
    "vanityChannelId",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.guildConfig.upsert({
      where: { guildId },
      update: data,
      create: { guildId, ...data },
    });
    await syncGuildCache(guildId, updated);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update settings:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
