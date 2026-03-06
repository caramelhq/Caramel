import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserGuilds, fetchBotGuilds, hasManageGuild, guildIconUrl } from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { DEV_BYPASS, DEV_GUILDS } from "@/lib/dev";

export async function GET() {
  if (DEV_BYPASS) return NextResponse.json(DEV_GUILDS);

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [userGuilds, botGuildIds] = await Promise.all([
      fetchUserGuilds(session.accessToken),
      fetchBotGuilds(),
    ]);

    const manageable = userGuilds.filter(
      (g) => hasManageGuild(g.permissions) && botGuildIds.has(g.id)
    );

    const guildIds = manageable.map((g) => g.id);
    const configs = await prisma.guildConfig.findMany({
      where: { guildId: { in: guildIds } },
      select: {
        guildId: true,
        vanityModule: true,
        modModule: true,
      },
    });

    const configMap = new Map(configs.map((c) => [c.guildId, c]));

    const TOTAL_MODULES = 2;

    const guilds = manageable.map((g) => {
      const cfg = configMap.get(g.id);
      let enabled = 0;
      if (cfg?.modModule) enabled++;
      if (cfg?.vanityModule) enabled++;

      return {
        id: g.id,
        name: g.name,
        icon: guildIconUrl(g.id, g.icon),
        memberCount: g.approximate_member_count ?? 0,
        modulesEnabled: enabled,
        modulesTotal: TOTAL_MODULES,
      };
    });

    return NextResponse.json(guilds);
  } catch (err) {
    console.error("[GUILDS] Failed to fetch guilds:", err);
    return NextResponse.json({ error: "Failed to fetch guilds" }, { status: 500 });
  }
}
