import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUsernames } from "@/lib/discord";
import { DEV_BYPASS, DEV_LOGS } from "@/lib/dev";

export async function GET(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "8"), 50);
  const action = searchParams.get("action");
  const search = searchParams.get("search");

  if (DEV_BYPASS) {
    let filtered = DEV_LOGS;
    if (action && action !== "all") {
      filtered = filtered.filter((l) => l.action === action);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.targetId.toLowerCase().includes(s) ||
          (l.targetName?.toLowerCase().includes(s)) ||
          l.moderatorId.toLowerCase().includes(s) ||
          (l.moderatorName?.toLowerCase().includes(s)) ||
          l.reason.toLowerCase().includes(s)
      );
    }
    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
    return NextResponse.json({
      logs: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  }

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;

  try {
    const where: Record<string, unknown> = { guildId };

    if (action && action !== "all") {
      where.action = action;
    }

    if (search) {
      where.OR = [
        { userId: { contains: search } },
        { moderatorId: { contains: search } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.modLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.modLog.count({ where }),
    ]);

    const allUserIds = logs.flatMap((l) => [l.userId, l.moderatorId]);
    const usernameMap = await resolveUsernames(allUserIds);

    const formatted = logs.map((l) => ({
      id: l.id,
      action: l.action,
      targetId: l.userId,
      targetName: usernameMap.get(l.userId) ?? null,
      moderatorId: l.moderatorId,
      moderatorName: usernameMap.get(l.moderatorId) ?? null,
      reason: l.reason ?? "",
      duration: l.duration ?? null,
      timestamp: l.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("Failed to fetch logs:", err);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
