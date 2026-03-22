import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events, DMChannel, GuildChannel } from 'discord.js';
import { prisma } from '../database/db';
import { CacheManager } from '../database/CacheManager';

/**
 * Ghost Channel Cleanup:
 * If a channel configured as 'modLogChannelId' or 'vanityChannelId' is deleted,
 * we clear it from the database and sync the cache.
 */
@ApplyOptions<Listener.Options>({
    event: Events.ChannelDelete
})
export class ChannelDeleteListener extends Listener {
    public async run(channel: DMChannel | GuildChannel) {
        if (channel.isDMBased()) return;
        const channelId = channel.id;

        try {
            // Find the guild where this channel was configured
            const affectedGuild = await prisma.guildConfig.findFirst({
                where: {
                    OR: [
                        { modLogChannelId: channelId },
                        { vanityChannelId: channelId }
                    ]
                }
            });

            if (!affectedGuild) return;

            const update: Record<string, any> = {};

            if (affectedGuild.modLogChannelId === channelId) {
                update.modLogChannelId = null;
                this.container.logger.info(`[CHANNEL-DELETE] Mod log channel ${channelId} deleted in ${channel.guild.name}, clearing from config`);
            }

            if (affectedGuild.vanityChannelId === channelId) {
                update.vanityChannelId = null;
                this.container.logger.info(`[CHANNEL-DELETE] Vanity log channel ${channelId} deleted in ${channel.guild.name}, clearing from config`);
            }

            if (Object.keys(update).length === 0) return;

            const updated = await prisma.guildConfig.update({ 
                where: { guildId: affectedGuild.guildId }, 
                data: update 
            });
            
            await CacheManager.syncGuild(affectedGuild.guildId, updated);
        } catch (error) {
            this.container.logger.error(`[CHANNEL-DELETE] Error handling channel deletion ${channelId}:`, error);
        }
    }
}
