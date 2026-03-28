import { Listener, container } from '@sapphire/framework';
import { Events, type VoiceState, TextChannel } from 'discord.js';
import { isSilentBanned } from '../../../services/SilentBanService';
import { trackVoiceJoin, isApproachingRateLimit } from '../../../lib/utils/VoiceRateLimit';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { emitAdvancedLog } from '../../../lib/logging/dispatcher';


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
        const { logger, music } = this.container;
        const botId = this.container.client.user?.id;
        const BOT_DISCONNECT_GRACE_MS = 5000;

        if (member && !member.user.bot) {
            const oldChannelId = oldState.channelId;
            const newChannelId = newState.channelId;

            if (oldChannelId !== newChannelId) {
                await emitAdvancedLog(guild, 'voiceUserUpdate', {
                    title: 'Voice User Movement',
                    fields: [
                        { name: 'User', value: `${member.user.tag} (${member.id})` },
                        { name: 'From', value: oldChannelId ? `<#${oldChannelId}>` : 'None', inline: true },
                        { name: 'To', value: newChannelId ? `<#${newChannelId}>` : 'None', inline: true }
                    ]
                });
            }

            const changedFlags: string[] = [];
            if (oldState.serverMute !== newState.serverMute) changedFlags.push(`serverMute: ${newState.serverMute ? 'on' : 'off'}`);
            if (oldState.serverDeaf !== newState.serverDeaf) changedFlags.push(`serverDeaf: ${newState.serverDeaf ? 'on' : 'off'}`);
            if (oldState.selfMute !== newState.selfMute) changedFlags.push(`selfMute: ${newState.selfMute ? 'on' : 'off'}`);
            if (oldState.selfDeaf !== newState.selfDeaf) changedFlags.push(`selfDeaf: ${newState.selfDeaf ? 'on' : 'off'}`);
            if (oldState.selfVideo !== newState.selfVideo) changedFlags.push(`selfVideo: ${newState.selfVideo ? 'on' : 'off'}`);
            if (oldState.streaming !== newState.streaming) changedFlags.push(`streaming: ${newState.streaming ? 'on' : 'off'}`);

            if (changedFlags.length > 0) {
                await emitAdvancedLog(guild, 'voiceStateUpdate', {
                    title: 'Voice State Updated',
                    fields: [
                        { name: 'User', value: `${member.user.tag} (${member.id})` },
                        { name: 'Changes', value: changedFlags.join('\n') }
                    ]
                });
            }
        }

        // 1. Handle bot being disconnected (Manually or otherwise) ──────────
        if (oldState.member?.id === botId && !newState.channelId) {
            const disconnectedGuildId = guild.id;

            setTimeout(async () => {
                const musicPlayer = music.queues.get(disconnectedGuildId);
                if (!musicPlayer) return;

                const stillDisconnected = !guild.members.me?.voice.channelId;
                if (!stillDisconnected) {
                    logger.info(`🎵 [MUSIC] Bot voice disconnect in ${disconnectedGuildId} was transient. Skipping kicked cleanup.`);
                    return;
                }

                logger.info(`🎵 [MUSIC] Bot disconnected from voice in ${disconnectedGuildId}. Cleaning up session...`);

                // Send personality message
                if (musicPlayer.textChannelId) {
                    const channel = await container.client.channels.fetch(musicPlayer.textChannelId).catch(() => null) as TextChannel | null;
                    if (channel) {
                        const msg = await resolveKey(channel.guild, 'music:messages.kicked');
                        await channel.send(getMessageLayout(msg) as any).catch(() => null);
                    }
                }

                await musicPlayer.clearState().catch(() => null);
                musicPlayer.dispose();
                music.queues.delete(disconnectedGuildId);
            }, BOT_DISCONNECT_GRACE_MS);

            return;
        }

        // 2. Auto-disconnect if bot is alone in channel ──────────
        const botVoiceChannel = guild.members.me?.voice.channel;
        if (botVoiceChannel && botVoiceChannel.members.filter(m => !m.user.bot).size === 0) {
            setTimeout(async () => {
                const recheckedChannel = guild.members.me?.voice.channel;
                if (recheckedChannel && recheckedChannel.members.filter(m => !m.user.bot).size === 0) {
                    logger.info(`🎵 [MUSIC] Channel empty in ${guild.id}. Leaving...`);
                    const musicPlayer = music.queues.get(guild.id);
                    if (musicPlayer) {
                        // Send personality message
                        if (musicPlayer.textChannelId) {
                            const channel = await container.client.channels.fetch(musicPlayer.textChannelId).catch(() => null) as TextChannel | null;
                            if (channel) {
                                const msg = await resolveKey(channel.guild, 'music:messages.emptyChannel');
                                await channel.send(getMessageLayout(msg) as any).catch(() => null);
                            }
                        }
                        await musicPlayer.clearState().catch(() => null);
                        musicPlayer.dispose();
                    }
                    
                    await music.leaveVoiceChannel(guild.id).catch(() => null);
                    music.queues.delete(guild.id);
                }
            }, 3000); // 3 seconds
        }

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
