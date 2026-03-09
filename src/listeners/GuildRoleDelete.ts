import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Role } from 'discord.js';
import { prisma } from '../database/db';
import { CacheManager } from '../database/CacheManager';


// Guild role delete listener ──────────────────

@ApplyOptions<Listener.Options>({
    event: Events.GuildRoleDelete
})
export class GuildRoleDeleteListener extends Listener {
    public async run(role: Role) {
        const guildId = role.guild.id;

        try {
            const config = await prisma.guildConfig.findUnique({ where: { guildId } });
            if (!config) return;

            const update: Record<string, any> = {};

            if (config.mutedRoleId === role.id) {
                update.mutedRoleId = null;
                update.modModule   = false;
                this.container.logger.info(`[ROLE-DELETE] Muted role deleted in ${role.guild.name}, clearing from config`);
            }

            if (config.vanityRoleId === role.id) {
                update.vanityRoleId = null;
                update.vanityModule = false;
                this.container.logger.info(`[ROLE-DELETE] Vanity role deleted in ${role.guild.name}, clearing from config`);
            }

            if (Object.keys(update).length === 0) return;

            const updated = await prisma.guildConfig.update({ where: { guildId }, data: update });
            await CacheManager.syncGuild(guildId, updated);
        } catch (error) {
            this.container.logger.error(`[ROLE-DELETE] Error handling role deletion in ${role.guild.name}:`, error);
        }
    }
}
