import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchGuildFromBot } from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { DEV_BYPASS, DEV_STATS } from "@/lib/dev";

export async function GET(_req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  if (DEV_BYPASS) return NextResponse.json(DEV_STATS);

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  try {
    const [
      discordGuild,
      config,
      modActions7d,
      modActionsPrev7d,
      activeMutes,
      activeSilentBans,
    ] = await Promise.all([
      fetchGuildFromBot(guildId),
      prisma.guildConfig.findUnique({ where: { guildId } }),
      prisma.modLog.count({
        where: { guildId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.modLog.count({
        where: { guildId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
      prisma.activeMute.count({ where: { guildId } }),
      prisma.silentBan.count({ where: { guildId } }),
    ]);

    let modulesEnabled = 0;
    if (config?.modModule) modulesEnabled++;
    if (config?.vanityModule) modulesEnabled++;

    const modChange = modActionsPrev7d > 0
      ? Math.round(((modActions7d - modActionsPrev7d) / modActionsPrev7d) * 100)
      : modActions7d > 0 ? 100 : 0;

    return NextResponse.json({
      memberCount: discordGuild?.approximate_member_count ?? 0,
      modulesEnabled,
      modulesTotal: 2,
      modActions7d,
      modActionsChange: modChange,
      activeMutes,
      activeSilentBans,
    });
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
