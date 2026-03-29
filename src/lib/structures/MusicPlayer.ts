import { Player, Track } from 'shoukaku';
import { container } from '@sapphire/framework';
import { getMusicPlayerLayout, getQueueLayout } from '../layouts/musicLayouts';
import { getMessageLayout } from '../layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { TextChannel } from 'discord.js';
import { getDominantColor } from '../utils/color';
import { cleanTrackTitle, formatDuration } from '../utils/MusicUtils';
import { getTrackDisplayMetadata, attachExternalMetadataToTrack } from '../utils/TrackMetadataResolver';
import { MusicPlayerTimingMs, MusicStateTtlSeconds } from '../constants/musicUi';


import { FilterPresets, FilterType } from '../constants/musicFilters';

// Global artwork color cache — persists across track changes and player instances
const artworkColorCache = new Map<string, number>();

// Music player ──────────────────

export class MusicPlayer {
    public queue: Track[] = [];
    public current: Track | null = null;
    public loop: boolean = false;
    public autoplay: boolean = false;
    public activeFilter: FilterType = 'off';
    public textChannelId: string | null = null;
    private lastMessageId: string | null = null;
    private currentTrackColor: number | null = null;
    private pendingColorExtraction: { promise: Promise<number | null>; rawUrl: string } | null = null;
    private isProcessing: boolean = false;
    private idleTimeout: NodeJS.Timeout | null = null;
    private persistenceInterval: NodeJS.Timeout | null = null;
    private disposed: boolean = false;
    public isRehydrating: boolean = false;

    public constructor(
        public readonly guildId: string, 
        public readonly player: Player, 
        initialState?: { queue: Track[], current: Track | null, loop: boolean, autoplay?: boolean, textChannelId: string | null, lastMessageId?: string | null, isPaused?: boolean, activeFilter?: FilterType }
    ) {
        // Clean up any existing listeners on the Shoukaku player (important for rehydration/reuse)
        this.player.removeAllListeners();

        if (initialState) {
            this.queue = initialState.queue;
            this.current = initialState.current;
            this.loop = initialState.loop;
            this.autoplay = initialState.autoplay ?? false;
            this.textChannelId = initialState.textChannelId;
            this.lastMessageId = initialState.lastMessageId ?? null;
            this.activeFilter = initialState.activeFilter ?? 'off';
            this.isRehydrating = true;

            // Apply filters if they were active
            if (this.activeFilter !== 'off') {
                const preset = FilterPresets[this.activeFilter];
                if (preset) this.player.setFilters(preset).catch(() => null);
            }
        }

        // Start persistence heartbeat
        this.persistenceInterval = setInterval(() => {
            if (this.disposed) return;
            if (this.current && !this.player.paused && !this.isRehydrating) {
                this.saveState().catch(() => null);
            }
        }, MusicPlayerTimingMs.persistenceHeartbeat);

        // Player events ──────────

        this.player.on('start', async () => {
            if (this.idleTimeout) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = null;
            }

            if (this.isRehydrating) return;

            container.logger.info(`🎵 [MUSIC] Started playing in ${this.guildId}: ${this.current?.info.title}`);

            // Await the color that was started in parallel with playTrack — should be ready or nearly so
            if (this.pendingColorExtraction) {
                const { promise, rawUrl } = this.pendingColorExtraction;
                this.pendingColorExtraction = null;
                const color = await promise;
                if (color) {
                    artworkColorCache.set(rawUrl, color);
                    this.currentTrackColor = color;
                }
            }

            await this.sendNowPlaying().catch(err => container.logger.error(`[MUSIC_PLAYER] Error sending now playing:`, err));
            await this.saveState().catch(() => null);

            // Pre-load next track's color and metadata in background so they're ready when the track starts
            const nextTrack = this.queue[0];
            if (nextTrack) {
                const nextDisplay = getTrackDisplayMetadata(nextTrack as any);
                const nextRawThumbnail = nextDisplay.artworkUrl
                    ?? `https://img.youtube.com/vi/${nextTrack.info.identifier}/maxresdefault.jpg`;

                if (!artworkColorCache.has(nextRawThumbnail)) {
                    getDominantColor(nextRawThumbnail)
                        .catch(() => getDominantColor(`https://img.youtube.com/vi/${nextTrack.info.identifier}/hqdefault.jpg`))
                        .then(color => { if (color) artworkColorCache.set(nextRawThumbnail, color); })
                        .catch(() => null);
                }

                if (!(nextTrack as any).displayMetadata) {
                    attachExternalMetadataToTrack(nextTrack as any).catch(() => null);
                }
            }
        });

        this.player.on('end', async (data) => {
            container.logger.info(`🎵 [MUSIC] Track ended in ${this.guildId}. Reason: ${data.reason}`);

            // If reason is 'replaced', it means another track started manually, so we don't playNext
            if (data.reason === 'replaced') return;

            // If reason is 'cleanup' or 'loadFailed', we shouldn't try to loop or playNext as the player might be closing
            if (['cleanup', 'loadFailed'].includes(data.reason)) return;

            if (this.loop && this.current && data.reason === 'finished') {
                const trackToRepeat = { ...this.current };
                container.logger.info(`🎵 [MUSIC] Looping track in ${this.guildId}`);
                await this.player.playTrack({ track: { encoded: (trackToRepeat as any).encoded } }).catch(() => this.playNext());
            } else {
                await this.playNext();
            }
            await this.saveState().catch(() => null);
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

            // If this instance was intentionally disposed (stop/leave), perform hard cleanup.
            if (this.disposed) {
                if (this.persistenceInterval) {
                    clearInterval(this.persistenceInterval);
                    this.persistenceInterval = null;
                }

                await this.deleteLastMessage();
                await this.clearState().catch(() => null);
                this.queue = [];
                this.current = null;
                return;
            }

            // Unexpected close (e.g. Lavalink restart): preserve in-memory queue/current for recovery.
            container.logger.warn(`⚠️ [MUSIC] Transient player close detected in ${this.guildId}; preserving state for reconnect.`);
            await this.saveState().catch(() => null);
        });
    }

    /**
     * Disposes timers and listeners for this player instance.
     */
    public dispose() {
        if (this.disposed) return;
        this.disposed = true;

        this.stopIdleTimeout();

        if (this.persistenceInterval) {
            clearInterval(this.persistenceInterval);
            this.persistenceInterval = null;
        }

        this.player.removeAllListeners();
    }

    /**
     * Sets a filter on the player.
     */
    public async setFilter(filter: FilterType) {
        this.activeFilter = filter;
        
        if (filter === 'off') {
            await this.player.clearFilters();
        } else {
            const preset = FilterPresets[filter];
            if (preset) await this.player.setFilters(preset);
        }

        await this.saveState().catch(() => null);
    }

    // State persistence ──────────

    /**
     * Saves the current player state to Redis.
     */
    public async saveState() {
        const { redis } = container;
        const guild = container.client.guilds.cache.get(this.guildId);
        const voiceChannelId = guild?.members.me?.voice.channelId;

        if (!voiceChannelId) return;

        const state = {
            guildId: this.guildId,
            textChannelId: this.textChannelId,
            voiceChannelId,
            lastMessageId: this.lastMessageId,
            loop: this.loop,
            autoplay: this.autoplay,
            activeFilter: this.activeFilter,
            isPaused: this.player.paused,
            position: this.player.position,
            timestamp: Date.now(),
            current: this.current
                ? {
                    encoded: (this.current as any).encoded,
                    info: this.current.info,
                    requestedBy: (this.current as any).requestedBy,
                    displayMetadata: (this.current as any).displayMetadata ?? null
                }
                : null,
            queue: this.queue.map(t => ({
                encoded: (t as any).encoded,
                info: t.info,
                requestedBy: (t as any).requestedBy,
                displayMetadata: (t as any).displayMetadata ?? null
            }))
        };

        if (!state.current && state.queue.length === 0) {
            await this.clearState();
        } else {
            await redis.set(`music:state:${this.guildId}`, JSON.stringify(state), 'EX', MusicStateTtlSeconds.playerState);
        }
    }

    /**
     * Clears the player state from Redis.
     */
    public async clearState() {
        const { redis } = container;
        await redis.del(`music:state:${this.guildId}`);
    }


    // Idle timeout logic ──────────

    private startIdleTimeout() {
        this.stopIdleTimeout();
        if (this.current || this.queue.length > 0) return;

        this.idleTimeout = setTimeout(async () => {
            this.idleTimeout = null;

            // Ignore stale timers from instances that are no longer active in the manager.
            const activePlayer = container.music.queues.get(this.guildId);
            if (activePlayer !== this) {
                container.logger.info(`🎵 [MUSIC] Ignoring stale idle timeout in ${this.guildId}.`);
                return;
            }

            // Re-validate state when timer fires to avoid stale idle leaves.
            const guild = container.client.guilds.cache.get(this.guildId);
            const botVoiceChannelId = guild?.members.me?.voice.channelId;
            const hasPlaybackState = Boolean(this.current || this.queue.length > 0);

            if (!botVoiceChannelId || hasPlaybackState) {
                container.logger.info(`🎵 [MUSIC] Idle timeout aborted in ${this.guildId}. Active playback state detected.`);
                return;
            }

            container.logger.info(`🎵 [MUSIC] Idle timeout reached in ${this.guildId}. Leaving...`);

            // Send personality message
            if (this.textChannelId) {
                const channel = await container.client.channels.fetch(this.textChannelId).catch(() => null) as TextChannel | null;
                if (channel) {
                    const msg = await resolveKey(channel.guild, 'music:messages.idle');
                    await channel.send(getMessageLayout(msg) as any).catch(() => null);
                }
            }

            // Final guard in case something started while sending the idle message.
            if (this.current || this.queue.length > 0) {
                container.logger.info(`🎵 [MUSIC] Idle leave cancelled in ${this.guildId}. Playback resumed.`);
                return;
            }

            const { music } = container;
            this.dispose();
            music.queues.delete(this.guildId);
            await music.leaveVoiceChannel(this.guildId).catch(() => null);
            // Fallback: disconnect directly via Discord.js in case Shoukaku's state is stale (e.g. bot was moved externally)
            await guild?.members.me?.voice.disconnect().catch(() => null);
        }, MusicPlayerTimingMs.idleDisconnect);
    }

    private stopIdleTimeout() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
    }


    // Plays the next track in the queue ──────────

    public async playNext(): Promise<void> {
        if (this.disposed) return;
        if (this.isProcessing) return;
        
        // Safety check: is the bot still in a voice channel?
        const guild = container.client.guilds.cache.get(this.guildId);
        if (!guild?.members.me?.voice.channelId) {
            this.stopIdleTimeout();
            return;
        }

        this.isProcessing = true;

        // Clear any idle timeout as we are now processing a potential track
        this.stopIdleTimeout();

        try {
            const lastTrack = this.current;
            this.current = this.queue.shift() ?? null;
            this.currentTrackColor = null;

            // Autoplay Logic ──────────
            if (!this.current && this.autoplay && lastTrack) {
                container.logger.info(`🎵 [MUSIC] Queue empty in ${this.guildId}, fetching autoplay track...`);
                
                const node = container.music.options.nodeResolver(container.music.nodes);
                if (node) {
                    let result: any = null;
                    let seedTrackId: string | null = null;
                    let seedArtistId: string | null = null;

                    // Step 1: Resolve seeds for Spotify
                    if (lastTrack.info.sourceName === 'spotify') {
                        seedTrackId = lastTrack.info.identifier;
                    } else if (lastTrack.info.uri?.includes('spotify.com/track/')) {
                        // Extract ID from URL if identifier is not a Spotify ID
                        const match = lastTrack.info.uri.match(/track\/([a-zA-Z0-9]+)/);
                        if (match) seedTrackId = match[1];
                    }

                    // Clean names for better search results
                    const cleanTitle = cleanTrackTitle(lastTrack.info.title, lastTrack.info.author);
                    const cleanAuthor = lastTrack.info.author.replace(/\s*-\s*Topic$/i, '').trim();

                    // If we still don't have a direct Spotify ID, search on Spotify
                    if (!seedTrackId) {
                        const search = await node.rest.resolve(`spsearch:${cleanAuthor} ${cleanTitle}`).catch(() => null);
                        if (search && (search.loadType === 'search' || search.loadType === 'track') && (search.data as any).length > 0) {
                            const track = Array.isArray(search.data) ? search.data[0] : (search.data as any);
                            seedTrackId = track.info.identifier;
                        }
                    }

                    // Try to get artist ID (optional but helpful)
                    const artistSearch = await node.rest.resolve(`spsearch:artist:${cleanAuthor}`).catch(() => null);
                    if (artistSearch && artistSearch.loadType === 'search' && (artistSearch.data as any).length > 0) {
                        seedArtistId = (artistSearch.data as any)[0].info.identifier;
                    }

                    container.logger.info(`🔍 [MUSIC] Autoplay Seeds -> Track: ${seedTrackId || 'None'} | Artist: ${seedArtistId || 'None'}`);

                    // Step 2: Fetch recommendations from Spotify (sprec)
                    if (seedTrackId) {
                        // LavaSrc 4.x simplified mix syntax: sprec:mix:track:ID
                        const query = `sprec:mix:track:${seedTrackId}`;
                        result = await node.rest.resolve(query).catch(() => null);
                        
                        if (result && (result.loadType === 'playlist' || (result.loadType === 'search' && (result.data as any).length > 0))) {
                            container.logger.info(`✨ [MUSIC] Using Spotify recommendations (sprec mix) for ${this.guildId}`);
                        } else {
                            // Try artist mix as fallback if track mix fails
                            if (seedArtistId) {
                                const artistQuery = `sprec:mix:artist:${seedArtistId}`;
                                result = await node.rest.resolve(artistQuery).catch(() => null);
                                if (result && (result.loadType === 'playlist' || (result.loadType === 'search' && (result.data as any).length > 0))) {
                                    container.logger.info(`✨ [MUSIC] Using Spotify Artist recommendations (sprec mix) for ${this.guildId}`);
                                } else {
                                    result = null;
                                }
                            } else {
                                result = null; 
                            }
                        }
                    }

                    // Step 3: Fallback to YouTube Radio (RD) if Spotify failed (or no Premium)
                    if (!result) {
                        let ytIdentifier = lastTrack.info.identifier;
                        if (lastTrack.info.sourceName !== 'youtube') {
                            const ytSearch = await node.rest.resolve(`ytsearch:${lastTrack.info.author} ${lastTrack.info.title}`).catch(() => null);
                            if (ytSearch && ytSearch.loadType === 'search' && ytSearch.data.length > 0) {
                                ytIdentifier = (ytSearch.data[0] as Track).info.identifier;
                            }
                        }
                        
                        const query = `https://www.youtube.com/watch?v=${ytIdentifier}&list=RD${ytIdentifier}`;
                        result = await node.rest.resolve(query).catch(() => null);
                        container.logger.info(`🎵 [MUSIC] Using Hybrid Autoplay (YouTube Discovery) for ${this.guildId}`);
                    }

                    // Step 4: Variety Picker & Spotify Enrichment
                    if (result && (result.loadType === 'playlist' || result.loadType === 'search')) {
                        const tracks = result.loadType === 'playlist' ? (result.data as any).tracks as Track[] : result.data as Track[];
                        
                        // Filter out the seed track
                        const candidates = tracks.filter(t => t.info.identifier !== lastTrack.info.identifier);

                        // Variety Picker: Group by author and limit to 3 tracks per artist
                        const groups = new Map<string, Track[]>();
                        for (const track of candidates) {
                            const author = track.info.author.toLowerCase();
                            if (!groups.has(author)) groups.set(author, []);
                            if (groups.get(author)!.length < 3) {
                                groups.get(author)!.push(track);
                            }
                        }

                        // Interleave tracks from different authors
                        const interleaved: Track[] = [];
                        const authors = Array.from(groups.keys());
                        
                        // Shuffle authors
                        for (let i = authors.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [authors[i], authors[j]] = [authors[j], authors[i]];
                        }

                        let hasMore = true;
                        let index = 0;
                        while (hasMore && interleaved.length < 20) {
                            hasMore = false;
                            for (const author of authors) {
                                const authorTracks = groups.get(author)!;
                                if (index < authorTracks.length) {
                                    interleaved.push(authorTracks[index]);
                                    hasMore = true;
                                }
                                if (interleaved.length >= 20) break;
                            }
                            index++;
                        }

                        if (interleaved.length > 0) {
                            container.logger.info(`✨ [MUSIC] Enriching ${interleaved.length} tracks with Spotify metadata...`);

                            // Step 5: Spotify Enrichment (Paralell)
                            // We try to find the Spotify version of each YouTube track to get HD artwork
                            const enrichedTracks = await Promise.all(interleaved.map(async (t) => {
                                // If already from spotify, skip
                                if (t.info.sourceName === 'spotify') return t;

                                const cleanTitle = cleanTrackTitle(t.info.title, t.info.author);
                                const spSearch = await node.rest.resolve(`spsearch:${t.info.author} ${cleanTitle}`).catch(() => null);
                                
                                if (spSearch && (spSearch.loadType === 'search' || spSearch.loadType === 'track') && (spSearch.data as any).length > 0) {
                                    const spTrack = Array.isArray(spSearch.data) ? spSearch.data[0] : (spSearch.data as any);
                                    // We return the Spotify track object so LavaSrc handles the YT audio resolution 
                                    // but we keep the HD artwork and clean metadata.
                                    (spTrack as any).requestedBy = container.client.user!.id;
                                    return spTrack;
                                }

                                // Fallback to the original YouTube track if Spotify search fails
                                (t as any).requestedBy = container.client.user!.id;
                                return t;
                            }));

                            for (const track of enrichedTracks) {
                                this.queue.push(track);
                            }
                            
                            this.current = this.queue.shift() ?? null;
                            container.logger.info(`✨ [MUSIC] Autoplay Hybrid complete! Queue populated with ${enrichedTracks.length} tracks.`);
                        }
                    }
                }
            }

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

            // Start color extraction in parallel with playTrack so it's ready (or nearly) when 'start' fires
            const curDisplay = getTrackDisplayMetadata(this.current as any);
            const curRawUrl = curDisplay.artworkUrl
                ?? `https://img.youtube.com/vi/${this.current.info.identifier}/maxresdefault.jpg`;
            const cachedColor = artworkColorCache.get(curRawUrl);
            if (cachedColor) {
                this.currentTrackColor = cachedColor;
                this.pendingColorExtraction = null;
            } else {
                this.pendingColorExtraction = {
                    rawUrl: curRawUrl,
                    promise: getDominantColor(curRawUrl)
                        .catch(() => getDominantColor(`https://img.youtube.com/vi/${this.current!.info.identifier}/hqdefault.jpg`))
                        .catch(() => null)
                };
            }

            await this.player.playTrack({ track: { encoded: (this.current as any).encoded } });
        } catch (error) {
            container.logger.error(`[MUSIC_PLAYER] Error in playNext for ${this.guildId}:`, error);
            // If failed, try the next one after a small delay
            setTimeout(() => {
                this.isProcessing = false;
                this.playNext();
            }, MusicPlayerTimingMs.playNextRetryDelay);
            return;
        }

        this.isProcessing = false;
    }

    /**
     * Clears all tracks from the queue that were injected by the autoplay system.
     */
    public clearAutoplayTracks() {
        const botId = container.client.user!.id;
        this.queue = this.queue.filter(track => (track as any).requestedBy !== botId);
        this.saveState().catch(() => null);
    }

    /**
     * Removes a track from the queue by its index (1-based).
     */
    public removeTrack(index: number): Track | null {
        if (index < 1 || index > this.queue.length) return null;
        const removed = this.queue.splice(index - 1, 1)[0];
        this.saveState().catch(() => null);
        return removed;
    }

    /**
     * Moves a track from one position to another (1-based).
     */
    public moveTrack(fromIndex: number, toIndex: number): boolean {
        if (fromIndex < 1 || fromIndex > this.queue.length || toIndex < 1 || toIndex > this.queue.length) return false;
        const track = this.queue.splice(fromIndex - 1, 1)[0];
        this.queue.splice(toIndex - 1, 0, track);
        this.saveState().catch(() => null);
        return true;
    }

    /**
     * Sets the player volume (0-200).
     */
    public async setVolume(volume: number) {
        // To prevent digital clipping/distortion at high volumes (>100), 
        // we can apply a slight negative gain in the equalizer as a safety measure
        // while still allowing the player to sound louder.
        const equalizer = [];
        if (volume > 100) {
            // Apply a slight reduction across all bands to create more "headroom"
            const reduction = -((volume - 100) / 400); // Max -0.25 gain at 200 volume
            for (let i = 0; i < 15; i++) {
                equalizer.push({ band: i, gain: reduction });
            }
        }

        // Direct update via REST is faster and doesn't reset the filter chain buffer
        await this.player.node.rest.updatePlayer({
            guildId: this.guildId,
            playerOptions: { 
                volume,
                filters: equalizer.length > 0 ? { equalizer } : undefined
            }
        });
        await this.saveState().catch(() => null);
    }

    /**
     * Seeks to a position in the current track.
     */
    public async seek(position: number) {
        await this.player.seekTo(position);
        await this.saveState().catch(() => null);
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

        const guild = container.client.guilds.cache.get(this.guildId);
        if (!guild?.members.me?.voice.channelId) return;

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

    /**
     * Refreshes the current player message with the latest state.
     */
    public async refresh() {
        if (!this.lastMessageId || !this.textChannelId) return;

        try {
            const channel = await container.client.channels.fetch(this.textChannelId).catch(() => null) as TextChannel | null;
            if (!channel) return;

            const message = await channel.messages.fetch(this.lastMessageId).catch(() => null);
            if (!message) return;

            const layout = await this.buildLayout(channel.guild);
            if (layout) {
                await message.edit(layout as any).catch(() => null);
            }
        } catch (error) {
            // Ignore refresh errors
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
        const tracks = this.queue.slice(start, end).map((t, i) => {
            const display = getTrackDisplayMetadata(t);

            return {
                index: start + i + 1,
                title: cleanTrackTitle(display.title, display.author),
                url: t.info.uri ?? '',
                author: display.author,
                duration: formatDuration(t.info.length ?? 0)
            };
        });

        const currentDisplay = this.current ? getTrackDisplayMetadata(this.current) : null;

        return getQueueLayout({
            title: queueTitle,
            nowPlayingLabel,
            currentTrackTitle: currentDisplay ? cleanTrackTitle(currentDisplay.title, currentDisplay.author) : 'None',
            currentTrackAuthor: currentDisplay?.author ?? '',
            tracks,
            currentPage,
            totalPages,
            totalTracks
        });
    }


    // Builds the player layout ──────────

    public async buildControlLayout(guild: any, userId?: string) {
        return this.buildLayout(guild, userId, true);
    }

    public async buildNowPlayingLayout(guild: any, userId?: string) {
        return this.buildLayout(guild, userId, false);
    }

    public async buildLayout(guild: any, userId?: string, showButtons: boolean = true) {
        const track = this.current;
        if (!track || !track.info) return null;
        const display = getTrackDisplayMetadata(track);

        const rawThumbnail = display.artworkUrl
            ?? `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;

        // Resolve labels and favorite check in parallel
        const [labelValues, isFavResult] = await Promise.all([
            Promise.all([
                resolveKey(guild, 'music:labels.nowPlaying'),
                resolveKey(guild, 'music:labels.requestedBy'),
                resolveKey(guild, 'music:labels.author'),
                resolveKey(guild, 'music:labels.pause'),
                resolveKey(guild, 'music:labels.resume'),
                resolveKey(guild, 'music:labels.skip'),
                resolveKey(guild, 'music:labels.stop'),
                resolveKey(guild, 'music:labels.loop'),
                resolveKey(guild, 'music:labels.queue'),
                resolveKey(guild, 'music:labels.in'),
                resolveKey(guild, 'music:labels.autoplay'),
            ]),
            userId && track.info.uri
                ? container.db.userFavorite.findUnique({
                    where: { userId_trackUrl: { userId, trackUrl: track.info.uri } }
                }).catch(() => null)
                : Promise.resolve(null)
        ]);

        const [nowPlaying, requestedBy, author, pause, resume, skip, stop, loop, queue, inLabel, autoplay] = labelValues;
        const labels = { nowPlaying, requestedBy, author, pause, resume, skip, stop, loop, queue, in: inLabel, autoplay };
        const isFavorited = !!isFavResult;

        // Color is pre-extracted in playNext() in parallel with playTrack. Just read from cache/field.
        // Fallback: if still null (e.g. loop restart, rehydration), extract it now so the color is never lost.
        if (!this.currentTrackColor) {
            const cached = artworkColorCache.get(rawThumbnail);
            if (cached) {
                this.currentTrackColor = cached;
            } else {
                const color = await getDominantColor(rawThumbnail)
                    .catch(() => getDominantColor(`https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`))
                    .catch(() => null);
                if (color) {
                    artworkColorCache.set(rawThumbnail, color);
                    this.currentTrackColor = color;
                }
            }
        }

        // Get voice channel ID from cache (avoid unnecessary API call)
        const voiceChannelId = guild.members.me?.voice.channelId;


        return getMusicPlayerLayout({
            title:       cleanTrackTitle(display.title, display.author),
            url:         track.info.uri ?? '',
            thumbnail:   rawThumbnail,
            author:      display.author,
            requestedBy: (track as any).requestedBy ?? 'Unknown',
            isPaused:    this.player.paused,
            isLooping:   this.loop,
            isAutoplay:  this.autoplay,
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
