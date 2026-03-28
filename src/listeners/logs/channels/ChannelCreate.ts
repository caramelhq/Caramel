import { Listener } from '@sapphire/framework';
import { Events, type NonThreadGuildBasedChannel } from 'discord.js';
import { CacheManager } from '../../../database/CacheManager';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';

/**
 * Ensures muted-role deny overwrites are applied to every newly created guild channel.
 */
export class ChannelCreateListener extends Listener<typeof Events.ChannelCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.ChannelCreate
        });
    }

    public async run(channel: NonThreadGuildBasedChannel) {
        if (!channel.guild || !('permissionOverwrites' in channel)) return;

        await emitAdvancedLog(channel.guild, 'channelCreate', {
            title: 'Channel Created',
            fields: [
                { name: 'Channel', value: `<#${channel.id}> (${channel.id})` },
                { name: 'Type', value: String(channel.type) }
            ]
        });

        const modConfig = await CacheManager.getModConfig(channel.guild.id);
        if (!modConfig.modModule || !modConfig.mutedRoleId) return;

        await channel.permissionOverwrites.edit(
            modConfig.mutedRoleId,
            {
                SendMessages: false,
                SendMessagesInThreads: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendTTSMessages: false
            },
            { reason: 'Caramel - auto apply muted role overwrite on channel create' }
        ).catch((error: unknown) => {
            this.container.logger.warn(
                `[CHANNEL_CREATE] Failed to apply muted overwrite in guild ${channel.guild.id} channel ${channel.id}: ${(error as Error)?.message ?? error}`
            );
        });
    }
}
