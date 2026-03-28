import { Listener } from '@sapphire/framework';
import { Events, type Guild } from 'discord.js';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

export class GuildUpdateListener extends Listener<typeof Events.GuildUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.GuildUpdate
        });
    }

    public async run(oldGuild: Guild, newGuild: Guild) {
        const onboardingChanged = oldGuild.rulesChannelId !== newGuild.rulesChannelId
            || oldGuild.publicUpdatesChannelId !== newGuild.publicUpdatesChannelId;

        if (onboardingChanged) {
            await emitAdvancedLog(newGuild, 'onboardingUpdate', {
                title: 'Onboarding Updated',
                fields: [
                    { name: 'Rules Channel', value: `${oldGuild.rulesChannelId ?? 'None'} -> ${newGuild.rulesChannelId ?? 'None'}` },
                    { name: 'Updates Channel', value: `${oldGuild.publicUpdatesChannelId ?? 'None'} -> ${newGuild.publicUpdatesChannelId ?? 'None'}` }
                ]
            });
        }

        const changes: string[] = [];

        if (oldGuild.name !== newGuild.name) changes.push(`name: ${oldGuild.name} -> ${newGuild.name}`);
        if (oldGuild.description !== newGuild.description) changes.push('description updated');
        if (oldGuild.icon !== newGuild.icon) changes.push('icon updated');
        if (oldGuild.banner !== newGuild.banner) changes.push('banner updated');
        if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
            changes.push(`vanity: ${oldGuild.vanityURLCode ?? 'None'} -> ${newGuild.vanityURLCode ?? 'None'}`);
        }

        if (changes.length === 0) return;

        await emitAdvancedLog(newGuild, 'guildUpdate', {
            title: 'Guild Updated',
            fields: [
                { name: 'Guild', value: `${newGuild.name} (${newGuild.id})` },
                { name: 'Changes', value: changes.join('\n').slice(0, 1000) }
            ]
        });
    }
}
