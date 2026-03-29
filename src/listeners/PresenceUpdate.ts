import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Presence, Events, ActivityType } from 'discord.js';
import { addVanityJob } from '../lib/utils/vanity';
import { addClanTagJob } from '../lib/utils/clanTag';


// Presence update listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.PresenceUpdate
})
export class PresenceUpdateListener extends Listener {
    public async run(oldPresence: Presence | null, newPresence: Presence) {
        const { guild, member } = newPresence;
        if (!guild || !member || member.user.bot) return;

        const oldState = oldPresence?.activities.find(a => a.type === ActivityType.Custom)?.state ?? null;
        const newState = newPresence.activities.find(a => a.type === ActivityType.Custom)?.state ?? null;

        // Vanity block ──────────

        if (oldState !== newState) {
            const vanityString = await this.container.redis.get(`vanity:string:${guild.id}`);
            if (vanityString) {
                const oldHas = oldState?.toLowerCase().includes(vanityString.toLowerCase()) ?? false;
                const newHas = newState?.toLowerCase().includes(vanityString.toLowerCase()) ?? false;

                if (oldHas !== newHas) {
                    try {
                        await addVanityJob(member, newHas);
                        this.container.logger.info(`[VANITY] Status update for ${member.user.tag}. Job sent. hasVanity=${newHas}`);
                    } catch (error) {
                        this.container.logger.error(`[QUEUE-ERROR] ${error}`);
                    }
                }
            }
        }

        // Clan tag block ──────────
        // Matching is done by guild ID — we check whether the member's primaryGuild.identityGuildId
        // equals this guild's ID, NOT by comparing tag strings. This prevents a spoofed match where
        // a member wearing a same-string tag from a completely different server would get the role.
        // Force-fetches the user because primaryGuild is a REST-only field not on cached user objects.
        // NOTE: oldPresence.member?.user.primaryGuild is unreliable (REST-only field, member often null on
        // old presence). We track last known state in Redis to avoid queuing duplicate jobs on every
        // presence event for members who are already wearing the tag.

        const clanTagModule = await this.container.redis.get(`clantag:module:${guild.id}`);
        if (!clanTagModule || (clanTagModule !== 'true' && clanTagModule !== '1')) return;

        const freshUser = await member.user.fetch(true).catch(() => null);
        if (!freshUser) return;

        const primaryGuild = (freshUser as any).primaryGuild;
        const newHasTag = primaryGuild?.identityGuildId === guild.id;
        // Capture the actual displayed tag string so the welcome layout can show it dynamically.
        const tagString: string = newHasTag ? (primaryGuild?.tag ?? '') : '';

        // Read last known state from Redis cache (set by the worker after role changes).
        // Falls back to null so that on first-ever presence event we always process.
        const cachedState = await this.container.redis.get(`clantag:member:${guild.id}:${member.id}`);
        const oldHasTag = cachedState === 'true' ? true : cachedState === 'false' ? false : null;

        if (oldHasTag !== null && oldHasTag === newHasTag) return;

        try {
            await addClanTagJob(member, newHasTag, tagString);
            this.container.logger.info(`[CLANTAG] Tag update for ${member.user.tag}. Job sent. hasTag=${newHasTag}`);
        } catch (error) {
            this.container.logger.error(`[CLANTAG-QUEUE-ERROR] ${error}`);
        }
    }
}
