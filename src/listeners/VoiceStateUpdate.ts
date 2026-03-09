import { Listener } from '@sapphire/framework';
import { Events, type VoiceState } from 'discord.js';
import { isSilentBanned } from '../services/SilentBanService';
import { trackVoiceJoin, isApproachingRateLimit } from '../lib/utils/VoiceRateLimit';


// Voice state update listener ──────────────────

export class VoiceStateUpdateListener extends Listener<typeof Events.VoiceStateUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: Events.VoiceStateUpdate
        });
    }

    public async run(oldState: VoiceState, newState: VoiceState) {
        const { member, guild } = newState;
        const { logger } = this.container;

        if (!newState.channel || !member || member.user.bot) return;
        if (oldState.channelId === newState.channelId) return;

        try {
            const banned = await isSilentBanned(guild.id, member.id);
            if (!banned) return;

            const { rateLimited, timeoutMs } = await trackVoiceJoin(guild.id, member.id);

            // Rate limit reached — apply escalating timeout and disconnect ──────────
            if (rateLimited && timeoutMs !== null) {
                await member.timeout(timeoutMs, 'Silent Ban: voice reconnect abuse').catch((err: any) => {
                    logger.error(`[SILENTBAN] ❌ Error applying timeout: ${err.message}`);
                });
                logger.info(`[SILENTBAN] ⏱️ ${timeoutMs / 1000}s timeout applied to ${member.user.tag} for voice abuse`);

                if (member.voice.channel) {
                    await member.voice.disconnect('Silent Ban: rate limit').catch(() => {});
                }
                return;
            }

            // Normal silent ban — disconnect from voice ──────────
            let disconnected = false;
            if (member.voice.channel) {
                await member.voice.disconnect('Silent Ban').then(() => {
                    disconnected = true;
                    logger.info(`[SILENTBAN] 🔇 ${member.user.tag} disconnected from voice.`);
                }).catch((err: any) => {
                    logger.warn(`[SILENTBAN] ⚠️ Direct disconnect failed: ${err.message}`);
                });
            }

            // Fallback if disconnect failed ──────────
            if (!disconnected) {
                const approaching = await isApproachingRateLimit(guild.id, member.id);
                if (approaching) {
                    await member.timeout(60 * 1000, 'Silent Ban: voice protection').catch((err: any) => {
                        logger.error(`[SILENTBAN] ❌ Error applying protective timeout: ${err.message}`);
                    });
                    logger.info(`[SILENTBAN] 🛡️ Protective timeout applied to ${member.user.tag} (disconnect failed + approaching rate limit)`);
                }

                const freshMember = await guild.members.fetch(member.id).catch(() => null);
                if (freshMember?.voice.channel) {
                    await freshMember.voice.disconnect('Silent Ban').catch(() => {});
                }
            }
        } catch (err: any) {
            logger.error(`[SILENTBAN] ❌ Error processing voice event: ${err.message}`);
        }
    }
}
