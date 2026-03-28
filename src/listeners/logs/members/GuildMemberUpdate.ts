import { Listener } from '@sapphire/framework';
import { Events, type GuildMember, type PartialGuildMember } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

function formatValue(value: string | null) {
    return value && value.trim().length > 0 ? value : 'None';
}

export class GuildMemberUpdateListener extends Listener<typeof Events.GuildMemberUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildMemberUpdate
        });
    }

    public async run(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
        if (newMember.user.bot) return;

        const changes: string[] = [];

        if (oldMember.nickname !== newMember.nickname) {
            changes.push(`nickname: ${formatValue(oldMember.nickname ?? null)} -> ${formatValue(newMember.nickname ?? null)}`);
        }

        if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
            const before = oldMember.communicationDisabledUntilTimestamp
                ? `<t:${Math.floor(oldMember.communicationDisabledUntilTimestamp / 1000)}:f>`
                : 'None';
            const after = newMember.communicationDisabledUntilTimestamp
                ? `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:f>`
                : 'None';
            changes.push(`timeout: ${before} -> ${after}`);
        }

        const oldRoles = oldMember.roles?.cache?.map((role) => role.id).sort().join(',') ?? '';
        const newRoles = newMember.roles.cache.map((role) => role.id).sort().join(',');
        if (oldRoles !== newRoles) {
            changes.push('roles updated');
        }

        if (changes.length === 0) return;

        await emitAdvancedLog(newMember.guild, 'guildMemberUpdate', {
            title: 'Member Updated',
            fields: [
                { name: 'User', value: `${newMember.user.tag} (${newMember.id})` },
                { name: 'Changes', value: changes.join('\n').slice(0, 1000) }
            ]
        });
    }
}
