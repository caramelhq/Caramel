import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEV_BYPASS, DEV_ACTIVITY } from "@/lib/dev";

export async function GET(_req: Request, { params }: { params: Promise<{ guildId: string }> }) {
  if (DEV_BYPASS) return NextResponse.json(DEV_ACTIVITY);

  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guildId } = await params;

  try {
    const days = 7;
    const result: { day: string; label: string; count: number }[] = [];
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const count = await prisma.modLog.count({
        where: {
          guildId,
          createdAt: { gte: start, lt: end },
        },
      });

      result.push({
        day: start.toISOString().split("T")[0],
        label: dayLabels[start.getDay()],
        count,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to fetch activity:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
