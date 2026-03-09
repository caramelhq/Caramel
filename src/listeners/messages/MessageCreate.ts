import { Listener } from '@sapphire/framework';
import { Events, type Message } from 'discord.js';
import { isSilentBanned } from '../../services/SilentBanService';
import { silentBanQueue } from '../../lib/utils/SilentBanQueue';


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

        const { logger, client } = this.container;
        const prefix = (client.options as any).defaultPrefix ?? 'c!';
        
        if (message.content.startsWith(prefix)) {
            logger.info(`[MESSAGE] Received from ${message.author.tag}: ${message.content}`);
        }

        if (!message.guild) return;

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

