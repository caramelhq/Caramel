import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGuildCache } from "@/lib/cache";
import { createPrivateChannel, createRole, fetchGuildFromBot } from "@/lib/discord";
import { DEV_BYPASS } from "@/lib/dev";

interface SetupBody {
    module: "vanity" | "mod";
    vanityString?: string;
    vanityRoleId?: string | null;
    vanityChannelId?: string | null;
    modLogChannelId?: string | null;
    mutedRoleId?: string | null;
    autoCreateRole?: boolean;
    autoCreateChannel?: boolean;
}

export async function POST(req: Request, { params }: { params: Promise<{ guildId: string }> }) {
    if (DEV_BYPASS) return NextResponse.json({ success: true });

    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guildId } = await params;
    const body: SetupBody = await req.json();
    const { module: moduleName } = body;

    if (moduleName !== "vanity" && moduleName !== "mod") {
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }

    try {
        const guild = await fetchGuildFromBot(guildId);
        if (!guild) {
            return NextResponse.json({ error: "Guild not found" }, { status: 404 });
        }

        if (moduleName === "vanity") {
            return handleVanitySetup(guildId, guild, body);
        }
        return handleModSetup(guildId, guild, body);
    } catch (err) {
        console.error("[SETUP] Failed:", err);
        return NextResponse.json({ error: "Setup failed" }, { status: 500 });
    }
}

// Vanity module setup ──────────────────

async function handleVanitySetup(guildId: string, guild: { name: string }, body: SetupBody) {
    const { vanityString, vanityRoleId, vanityChannelId, autoCreateRole, autoCreateChannel } = body;

    if (!vanityString?.trim()) {
        return NextResponse.json({ error: "Vanity keyword is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {
        vanityString: vanityString.trim(),
        vanityModule: true,
    };

    if (autoCreateRole) {
        const role = await createRole(guildId, `Vanity Role [${guild.name}]`, 0xd77655, "Caramel - Vanity role auto-created");
        if (!role) return NextResponse.json({ error: "Failed to create vanity role" }, { status: 502 });
        data.vanityRoleId = role.id;
        data.vanityRoleCreatedByBot = true;
    } else if (vanityRoleId) {
        data.vanityRoleId = vanityRoleId;
        data.vanityRoleCreatedByBot = false;
    }

    if (autoCreateChannel) {
        const channel = await createPrivateChannel(guildId, "vanity-logs");
        if (!channel) return NextResponse.json({ error: "Failed to create vanity log channel" }, { status: 502 });
        data.vanityChannelId = channel.id;
        data.vanityChannelCreatedByBot = true;
    } else if (vanityChannelId) {
        data.vanityChannelId = vanityChannelId;
        data.vanityChannelCreatedByBot = false;
    }

    if (!data.vanityRoleId || !data.vanityChannelId) {
        return NextResponse.json({ error: "Role and channel are required (select existing or auto-create)" }, { status: 400 });
    }

    const updated = await prisma.guildConfig.upsert({
        where: { guildId },
        update: data,
        create: { guildId, ...data },
    });
    await syncGuildCache(guildId, updated);

    return NextResponse.json({
        success: true,
        created: {
            role: autoCreateRole ? data.vanityRoleId : null,
            channel: autoCreateChannel ? data.vanityChannelId : null,
        },
    });
}

// Moderation module setup ──────────────────

async function handleModSetup(guildId: string, _guild: { name: string }, body: SetupBody) {
    const { modLogChannelId, mutedRoleId, autoCreateRole, autoCreateChannel } = body;

    const data: Record<string, unknown> = {
        modModule: true,
    };

    if (autoCreateChannel) {
        const channel = await createPrivateChannel(guildId, "mod-logs");
        if (!channel) return NextResponse.json({ error: "Failed to create mod log channel" }, { status: 502 });
        data.modLogChannelId = channel.id;
        data.modChannelCreatedByBot = true;
    } else if (modLogChannelId) {
        data.modLogChannelId = modLogChannelId;
        data.modChannelCreatedByBot = false;
    }

    if (autoCreateRole) {
        const role = await createRole(guildId, "Muted", 0x818386, "Caramel - Muted role auto-created");
        if (!role) return NextResponse.json({ error: "Failed to create muted role" }, { status: 502 });
        data.mutedRoleId = role.id;
        data.modRoleCreatedByBot = true;
    } else if (mutedRoleId) {
        data.mutedRoleId = mutedRoleId;
        data.modRoleCreatedByBot = false;
    }

    if (!data.modLogChannelId || !data.mutedRoleId) {
        return NextResponse.json({ error: "Log channel and muted role are required (select existing or auto-create)" }, { status: 400 });
    }

    const updated = await prisma.guildConfig.upsert({
        where: { guildId },
        update: data,
        create: { guildId, ...data },
    });
    await syncGuildCache(guildId, updated);

    return NextResponse.json({
        success: true,
        created: {
            role: autoCreateRole ? data.mutedRoleId : null,
            channel: autoCreateChannel ? data.modLogChannelId : null,
        },
    });
}
