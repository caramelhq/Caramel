import { resolveKey } from '@sapphire/plugin-i18next';
import { APIRole, GuildMember, Role } from 'discord.js';
import { prisma } from '../../../../database/db.js';
import { CaramelUserError } from '../../../../lib/structures/Errors.js';
import { CacheManager } from '../../../../database/CacheManager.js';
import { ContainerComponent, TextDisplayComponent } from '../../../../lib/layouts/ui.js';

export interface PermsServiceOptions {
    interaction: any;
    guildId: string;
    role: Role | APIRole | null;
    member: GuildMember | null;
    action?: string;
}

// ─────────────────────────────────────────────
//  Target resolution
// ─────────────────────────────────────────────

function resolveTarget(role: Role | APIRole | null, member: GuildMember | null) {
    if (!role && !member) throw new CaramelUserError('modcommands:perms.errors.noTarget');
    if (role && member)   throw new CaramelUserError('modcommands:perms.errors.bothTargets');

    return role
        ? { targetId: role.id,    targetType: 'ROLE'   as const, display: `<@&${role.id}>` }
        : { targetId: member!.id, targetType: 'MEMBER' as const, display: `<@${member!.id}>` };
}


// ─────────────────────────────────────────────
//  Allow
// ─────────────────────────────────────────────

export async function executePermsAllow({ interaction, guildId, role, member, action }: PermsServiceOptions) {
    const { targetId, targetType, display } = resolveTarget(role, member);

    await prisma.modPermission.upsert({
        where:  { guildId_targetId_action: { guildId, targetId, action: action! } },
        create: { guildId, targetId, targetType, action: action!, type: 'ALLOW' },
        update: { type: 'ALLOW', targetType },
    });

    await CacheManager.invalidateModPermissions(guildId);

    const msg = await resolveKey(interaction, 'modcommands:perms.allow.success', { name: display, action });
    return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(msg)])] });
}


// ─────────────────────────────────────────────
//  Deny
// ─────────────────────────────────────────────

export async function executePermsDeny({ interaction, guildId, role, member, action }: PermsServiceOptions) {
    const { targetId, targetType, display } = resolveTarget(role, member);

    await prisma.modPermission.upsert({
        where:  { guildId_targetId_action: { guildId, targetId, action: action! } },
        create: { guildId, targetId, targetType, action: action!, type: 'DENY' },
        update: { type: 'DENY', targetType },
    });

    await CacheManager.invalidateModPermissions(guildId);

    const msg = await resolveKey(interaction, 'modcommands:perms.deny.success', { name: display, action });
    return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(msg)])] });
}


// ─────────────────────────────────────────────
//  Delete
// ─────────────────────────────────────────────

export async function executePermsDelete({ interaction, guildId, role, member, action }: PermsServiceOptions) {
    const { targetId, display } = resolveTarget(role, member);

    const deleted = await prisma.modPermission.deleteMany({
        where: { guildId, targetId, action: action! },
    });

    await CacheManager.invalidateModPermissions(guildId);

    if (deleted.count === 0) {
        const msg = await resolveKey(interaction, 'modcommands:perms.delete.notFound', { name: display, action });
        return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(msg)])] });
    }

    const msg = await resolveKey(interaction, 'modcommands:perms.delete.success', { name: display, action });
    return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(msg)])] });
}


// ─────────────────────────────────────────────
//  List
// ─────────────────────────────────────────────

export async function executePermsList({ interaction, guildId, role, member }: PermsServiceOptions) {
    const { targetId, display } = resolveTarget(role, member);

    const perms = await prisma.modPermission.findMany({
        where:   { guildId, targetId },
        orderBy: { action: 'asc' },
    });

    if (perms.length === 0) {
        const msg = await resolveKey(interaction, 'modcommands:perms.list.empty', { name: display });
        return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(msg)])] });
    }

    const title = await resolveKey(interaction, 'modcommands:perms.list.title', { name: display });
    const lines = perms.map((p: any) => {
        const icon = p.type === 'ALLOW' ? '✅' : '🚫';
        return `${icon} \`${p.action}\``;
    });

    return interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${title}\n${lines.join('\n')}`)])] });
}
