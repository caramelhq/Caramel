import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsernames } from "@/lib/discord";
import { DEV_BYPASS, DEV_ACTIONS } from "@/lib/dev";
import type { ModLog } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ guildId: string }> },
) {
  if (DEV_BYPASS) {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "5"), 50);
    return NextResponse.json(DEV_ACTIONS.slice(0, limit));
  }

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5"), 50);

  try {
    const actions = await prisma.modLog.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const allUserIds = actions.flatMap((a: ModLog) => [
      a.userId,
      a.moderatorId,
    ]);
    const usernameMap = await resolveUsernames(allUserIds);

    const formatted = actions.map((a: ModLog) => ({
      id: a.id,
      action: a.action,
      userId: a.userId,
      userName: usernameMap.get(a.userId) ?? null,
      moderatorId: a.moderatorId,
      moderatorName: usernameMap.get(a.moderatorId) ?? null,
      reason: a.reason,
      duration: a.duration,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Failed to fetch actions:", err);
    return NextResponse.json(
      { error: "Failed to fetch actions" },
      { status: 500 },
    );
  }
}
