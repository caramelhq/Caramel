import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Presence, Events, ActivityType } from 'discord.js';
import { addVanityJob } from '../lib/utils/vanity';


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

        if (oldState === newState) return;

        const vanityString = await this.container.redis.get(`vanity:string:${guild.id}`);
        if (!vanityString) return;

        const oldHas = oldState?.toLowerCase().includes(vanityString.toLowerCase()) ?? false;
        const newHas = newState?.toLowerCase().includes(vanityString.toLowerCase()) ?? false;

        if (oldHas === newHas) return;

        try {
            await addVanityJob(member, newHas);
            this.container.logger.info(`📤 [VANITY] Status update for ${member.user.tag}. Job sent. hasVanity=${newHas}`);
        } catch (error) {
            this.container.logger.error(`[QUEUE-ERROR] ${error}`);
        }
    }
}