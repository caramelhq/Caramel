import { Player, Track } from 'shoukaku';
import { container } from '@sapphire/framework';
import { getMusicPlayerLayout, getQueueLayout } from '../layouts/musicLayouts';
import { resolveKey } from '@sapphire/plugin-i18next';
import { TextChannel } from 'discord.js';
import { getDominantColor } from '../utils/color';
import { cleanTrackTitle, formatDuration } from '../utils/MusicUtils';


// Music player ──────────────────

export class MusicPlayer {
    public queue: Track[] = [];
    public current: Track | null = null;
    public loop: boolean = false;
    public textChannelId: string | null = null;
    private lastMessageId: string | null = null;
    private currentTrackColor: number | null = null;
    private isProcessing: boolean = false;
    private idleTimeout: NodeJS.Timeout | null = null;

    public constructor(public readonly guildId: string, public readonly player: Player) {

        // Player events ──────────

        this.player.on('start', async () => {
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = null;
            }
            container.logger.info(`🎵 [MUSIC] Started playing in ${this.guildId}: ${this.current?.info.title}`);
            await this.sendNowPlaying().catch(err => container.logger.error(`[MUSIC_PLAYER] Error sending now playing:`, err));
        });

        this.player.on('end', async (data) => {
            container.logger.info(`🎵 [MUSIC] Track ended in ${this.guildId}. Reason: ${data.reason}`);

            // If reason is 'replaced', it means another track started manually, so we don't playNext
            if (data.reason === 'replaced') return;

            if (this.loop && this.current) {
                const trackToRepeat = { ...this.current };
                container.logger.info(`🎵 [MUSIC] Looping track in ${this.guildId}`);
                await this.player.playTrack({ track: { encoded: (trackToRepeat as any).encoded } }).catch(() => this.playNext());
            } else {
                this.current = null; // Clear current before moving to next
                await this.playNext();
            }
        });

        this.player.on('exception', (error) => {
            container.logger.error(`[MUSIC_PLAYER] Exception in guild ${this.guildId}:`, error);
            this.playNext(); // Try to skip the broken track
        });

        this.player.on('stuck', (data) => {
            container.logger.warn(`⚠️ [MUSIC] Track stuck in ${this.guildId} at ${data.thresholdMs}ms. Skipping...`);
            this.playNext();
        });

        this.player.on('closed', async () => {
            container.logger.info(`🎵 [MUSIC] Player connection closed in ${this.guildId}. cleaning up...`);
            this.stopIdleTimeout();
            await this.deleteLastMessage();
            this.queue = [];
            this.current = null;
        });
    }

    // Idle timeout logic ──────────

    private startIdleTimeout() {
        this.stopIdleTimeout();
        if (this.player.track || this.current) return;

        this.idleTimeout = setTimeout(async () => {
            container.logger.info(`🎵 [MUSIC] Idle timeout reached in ${this.guildId}. Leaving...`);
            const { music } = container;
            await music.leaveVoiceChannel(this.guildId);
            music.queues.delete(this.guildId);
        }, 180000); // 3 minutes
    }

    private stopIdleTimeout() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
    }


    // Plays the next track in the queue ──────────

    public async playNext(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // Clear any idle timeout as we are now processing a potential track
        this.stopIdleTimeout();

        try {
            // If we have a track in queue, or we are specifically told to play something (current)
            this.current = this.queue.shift() ?? null;
            this.currentTrackColor = null;

            if (!this.current) {
                container.logger.info(`🎵 [MUSIC] Queue empty in ${this.guildId}`);
                await this.deleteLastMessage();
                
                // Double check queue after await, a track might have been added during deleteLastMessage
                if (this.queue.length > 0) {
                    this.isProcessing = false;
                    return this.playNext();
                }

                this.startIdleTimeout();
                this.isProcessing = false;
                return;
            }

            await this.player.playTrack({ track: { encoded: (this.current as any).encoded } });
        } catch (error) {
            container.logger.error(`[MUSIC_PLAYER] Error in playNext for ${this.guildId}:`, error);
            // If failed, try the next one after a small delay
            setTimeout(() => {
                this.isProcessing = false;
                this.playNext();
            }, 1000);
            return;
        }

        this.isProcessing = false;
    }

    // Shuffle the queue ──────────

    public shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }


    // Sends the "Now Playing" UI to the text channel ──────────

    public async sendNowPlaying() {
        if (!this.current || !this.textChannelId) return;

        const channel = await container.client.channels.fetch(this.textChannelId).catch(() => null) as TextChannel | null;
        if (!channel) return;

        // Fire and forget the deletion of the old message to not block the new one
        this.deleteLastMessage().catch(() => null);

        // Re-check current before building layout as it might have changed during deleteLastMessage
        if (!this.current) return;

        // Use requestedBy for the initial favorite check
        const requestedBy = (this.current as any).requestedBy;
        const layout = await this.buildLayout(channel.guild, requestedBy);
        if (!layout) return;

        try {
            const message = await channel.send(layout as any);
            this.lastMessageId = message.id;
        } catch (error) {
            container.logger.error(`[MUSIC_PLAYER] Failed to send layout in ${this.guildId}:`, error);
        }
    }

    // Deletes the last player message ──────────

    public async deleteLastMessage() {
        if (!this.lastMessageId || !this.textChannelId) return;

        const channelId = this.textChannelId;
        const messageId = this.lastMessageId;
        this.lastMessageId = null; // Nullify immediately to avoid double deletion

        try {
            const channel = await container.client.channels.fetch(channelId).catch(() => null) as TextChannel | null;
            if (!channel) return;

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (message && message.deletable) {
                await message.delete().catch(() => null);
            }
        } catch (error) {
            // Ignore deletion errors
        }
    }


    // Builds the queue layout ──────────

    public async buildQueueLayout(guild: any, page: number = 1) {
        const queueTitle = await resolveKey(guild, 'music:labels.queue');
        const nowPlayingLabel = await resolveKey(guild, 'music:labels.nowPlaying');
        
        const totalTracks = this.queue.length;
        const totalPages = Math.max(1, Math.ceil(totalTracks / 10));
        const currentPage = Math.min(Math.max(1, page), totalPages);

        const start = (currentPage - 1) * 10;
        const end = start + 10;
        const tracks = this.queue.slice(start, end).map((t, i) => ({
            index: start + i + 1,
            title: cleanTrackTitle(t.info.title, t.info.author),
            url: t.info.uri ?? '',
            author: t.info.author,
            duration: formatDuration(t.info.length ?? 0)
        }));

        return getQueueLayout({
            title: queueTitle,
            nowPlayingLabel,
            currentTrackTitle: cleanTrackTitle(this.current?.info.title ?? 'None', this.current?.info.author),
            currentTrackAuthor: this.current?.info.author ?? '',
            tracks,
            currentPage,
            totalPages,
            totalTracks
        });
    }


    // Builds the player layout ──────────

    public async buildLayout(guild: any, userId?: string, showButtons: boolean = true) {
        const track = this.current;
        if (!track || !track.info) return null;

        const labels = {
            nowPlaying:  await resolveKey(guild, 'music:labels.nowPlaying'),
            requestedBy: await resolveKey(guild, 'music:labels.requestedBy'),
            author:      await resolveKey(guild, 'music:labels.author'),
            pause:       await resolveKey(guild, 'music:labels.pause'),
            resume:      await resolveKey(guild, 'music:labels.resume'),
            skip:        await resolveKey(guild, 'music:labels.skip'),
            stop:        await resolveKey(guild, 'music:labels.stop'),
            loop:        await resolveKey(guild, 'music:labels.loop'),
            queue:       await resolveKey(guild, 'music:labels.queue'),
            in:          await resolveKey(guild, 'music:labels.in')
        };

        const thumbnail = track.info.artworkUrl 
            ?? `https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`;

        if (!this.currentTrackColor) {
            this.currentTrackColor = await getDominantColor(thumbnail);
        }

        // Check if track is favorited by the user
        let isFavorited = false;
        if (userId && track.info.uri) {
            const favorite = await container.db.userFavorite.findUnique({
                where: {
                    userId_trackUrl: {
                        userId,
                        trackUrl: track.info.uri
                    }
                }
            }).catch(() => null);
            isFavorited = !!favorite;
        }

        // Get voice channel ID
        const botMember = await guild.members.fetch(container.client.user!.id).catch(() => null);
        const voiceChannelId = botMember?.voice.channelId;


        return getMusicPlayerLayout({
            title:       cleanTrackTitle(track.info.title, track.info.author),
            url:         track.info.uri ?? '',
            thumbnail:   thumbnail,
            author:      track.info.author,
            requestedBy: (track as any).requestedBy ?? 'Unknown',
            isPaused:    this.player.paused,
            isLooping:   this.loop,
            isFavorited,
            position:    this.player.position,
            duration:    track.info.length ?? 0,
            voiceChannelId: voiceChannelId ?? undefined,
            showButtons,
            accentColor: this.currentTrackColor ?? undefined,
            labels
        });
    }
}
