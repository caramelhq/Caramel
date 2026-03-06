import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchGuildFromBot, guildIconUrl } from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { DEV_BYPASS, DEV_GUILDS } from "@/lib/dev";

export async function GET(_req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  if (DEV_BYPASS) {
    const g = DEV_GUILDS.find((g) => g.id === guildId) ?? DEV_GUILDS[0];
    return NextResponse.json({ ...g, config: null });
  }

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [discordGuild, config] = await Promise.all([
      fetchGuildFromBot(guildId),
      prisma.guildConfig.findUnique({ where: { guildId } }),
    ]);

    if (!discordGuild) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    }

    let modulesEnabled = 0;
    if (config?.modModule) modulesEnabled++;
    if (config?.vanityModule) modulesEnabled++;

    return NextResponse.json({
      id: discordGuild.id,
      name: discordGuild.name,
      icon: guildIconUrl(discordGuild.id, discordGuild.icon),
      memberCount: discordGuild.approximate_member_count ?? 0,
      modulesEnabled,
      modulesTotal: 2,
      config: config ?? null,
    });
  } catch (err) {
    console.error("Failed to fetch guild:", err);
    return NextResponse.json({ error: "Failed to fetch guild" }, { status: 500 });
  }
}
