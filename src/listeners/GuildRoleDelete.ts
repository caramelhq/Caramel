import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, Role } from 'discord.js';
import { prisma } from '../database/db';
import { CacheManager } from '../database/CacheManager';

/**
 * Ghost Role Cleanup:
 * If a role configured as 'mutedRoleId' or 'vanityRoleId' is deleted,
 * we clear it from the database and sync the cache.
 */
@ApplyOptions<Listener.Options>({
    event: Events.GuildRoleDelete
})
export class GuildRoleDeleteListener extends Listener {
    public async run(role: Role) {
        const roleId = role.id;

        try {
            // Find the guild where this role was configured
            const affectedGuild = await prisma.guildConfig.findFirst({
                where: {
                    OR: [
                        { mutedRoleId: roleId },
                        { vanityRoleId: roleId }
                    ]
                }
            });

            if (!affectedGuild) return;

            const update: Record<string, any> = {};

            if (affectedGuild.mutedRoleId === roleId) {
                update.mutedRoleId = null;
                // If the required role is gone, we might want to disable the module or just clear the ID.
                // The user requested setting the field to null.
                this.container.logger.info(`[ROLE-DELETE] Muted role ${roleId} deleted in ${role.guild.name}, clearing from config`);
            }

            if (affectedGuild.vanityRoleId === roleId) {
                update.vanityRoleId = null;
                this.container.logger.info(`[ROLE-DELETE] Vanity role ${roleId} deleted in ${role.guild.name}, clearing from config`);
            }

            if (Object.keys(update).length === 0) return;

            const updated = await prisma.guildConfig.update({ 
                where: { guildId: affectedGuild.guildId }, 
                data: update 
            });
            
            await CacheManager.syncGuild(affectedGuild.guildId, updated);
        } catch (error) {
            this.container.logger.error(`[ROLE-DELETE] Error handling role deletion ${roleId}:`, error);
        }
    }
}
