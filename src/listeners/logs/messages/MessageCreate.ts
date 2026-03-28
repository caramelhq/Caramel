import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';
import { isSilentBanned } from '../../../services/SilentBanService';
import { silentBanQueue } from '../../../lib/utils/SilentBanQueue';
import { CacheManager } from '../../../database/CacheManager';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';


// Message create listener ──────────────────

export class MessageCreateListener extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const { logger } = this.container;
        const prefix = await CacheManager.getPrefix(message.guild.id);
        const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.gg|discord(app)?\.com\/invite)\/[a-z0-9-]+/i;

        if (inviteRegex.test(message.content)) {
            await emitAdvancedLog(message.guild, 'invitePost', {
                title: 'Invite Posted',
                fields: [
                    { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                    { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Content', value: message.content.slice(0, 1000) }
                ]
            });
        }

        if ((message as any).poll) {
            await emitAdvancedLog(message.guild, 'pollCreate', {
                title: 'Poll Created',
                fields: [
                    { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                    { name: 'Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Message ID', value: message.id }
                ]
            });
        }
        
        if (message.content.startsWith(prefix)) {
            logger.info(`[MESSAGE] Received from ${message.author.tag}: ${message.content}`);

            await emitAdvancedLog(message.guild, 'messageSentUsingCommand', {
                title: 'Message Sent via Command',
                fields: [
                    { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
                    { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Content', value: message.content.slice(0, 1000) }
                ]
            });
        }

        try {
            const banned = await isSilentBanned(message.guild.id, message.author.id);
            if (!banned) return;

            if (message.deletable) {
                await message.delete().catch((err) => {
                    logger.warn(`[SILENTBAN] ⚠️ Could not delete message from ${message.author.tag}: ${err.message}`);
                });
                logger.info(`[SILENTBAN] 🗑️ Message deleted (direct) from ${message.author.tag}`);
            } else {
                await silentBanQueue.add(
                    'message_delete',
                    {
                        channelId: message.channel.id,
                        messageId: message.id,
                        guildId: message.guild.id
                    },
                    {
                        jobId: `msgdel-${message.id}`,
                        removeOnComplete: true,
                        removeOnFail: true,
                        attempts: 1
                    }
                );
            }
        } catch (err: any) {
            logger.error(`[SILENTBAN] ❌ Error processing message: ${err.message}`);
        }
    }
}

