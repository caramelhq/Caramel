import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, GuildMember } from 'discord.js';
import { addVanityJob } from '../lib/utils/vanity';
import { prisma } from '../database/db';


// Guild member add listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.GuildMemberAdd
})
export class GuildMemberAddListener extends Listener {
    public async run(member: GuildMember) {
        if (member.user.bot) return;

        // Queue vanity check with a small delay to allow presence to load ──────────
        setTimeout(async () => {
            try {
                const vanityString = await this.container.redis.get(`vanity:string:${member.guild.id}`);
                const status       = member.presence?.activities.find(a => a.state)?.state ?? '';
                const hasVanity    = !!vanityString && status.includes(vanityString);
                await addVanityJob(member, hasVanity);
            } catch (error) {
                this.container.logger.error(`[QUEUE-JOIN] Error adding ${member.id} to queue:`, error);
            }
        }, 2000);

        // Reapply mute if they had one active on leave ──────────
        try {
            const activeMute = await prisma.activeMute.findUnique({
                where: { mute_guild_user_unique: { guildId: member.guild.id, userId: member.id } }
            });

            if (!activeMute) return;

            if (activeMute.expiresAt && activeMute.expiresAt < new Date()) {
                await prisma.activeMute.delete({ where: { id: activeMute.id } });
                return;
            }

            const ms = activeMute.expiresAt
                ? activeMute.expiresAt.getTime() - Date.now()
                : 28 * 24 * 60 * 60 * 1000;

            await member.timeout(ms, 'Reapplied mute on rejoin');
            this.container.logger.info(`[MUTE-REJOIN] Reapplied mute to ${member.user.tag} in ${member.guild.name}`);
        } catch (error) {
            this.container.logger.error(`[MUTE-REJOIN] Failed to reapply mute to ${member.id}:`, error);
        }
    }
}