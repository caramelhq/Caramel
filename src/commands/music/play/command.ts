import { Command } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';
import { getSearchLayout } from '../../../lib/layouts/musicLayouts';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../../lib/constants/emojis';
import { MusicPlayer } from '../../../lib/structures/MusicPlayer';
import { cleanTrackTitle, formatDuration } from '../../../lib/utils/MusicUtils';
import { attachExternalMetadataToTrack, getTrackDisplayMetadata } from '../../../lib/utils/TrackMetadataResolver';
import musicEn from '../../../lib/i18n/en-US/music.json';
import musicEs from '../../../lib/i18n/es-ES/music.json';
import { getPlayAutocompleteChoices } from '../../../command-helpers/music/play/core/autocomplete';
import { isSpotifyCollectionUrl, resolveSearchWithFallback, resolveWithSpotifyFallback } from '../../../command-helpers/music/play/core/resolver';


// Play command ──────────────────

export class PlayCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'play',
            description: musicEn.command.play.description,
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDescriptionLocalizations({ 'es-ES': musicEs.command.play.description })
                .addStringOption((option) =>
                    option
                        .setName('query')
                    .setDescription(musicEn.command.play.options.query)
                    .setDescriptionLocalizations({ 'es-ES': musicEs.command.play.options.query })
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        );
    }


    // Autocomplete ──────────

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name !== 'query') return interaction.respond([]);

        const query = focusedOption.value;

        try {
            const results = await getPlayAutocompleteChoices(this, interaction.user.id, query);
            return interaction.respond(results);
        } catch (err) {
            this.container.logger.error('[PLAY_AUTOCOMPLETE] Error:', err);
            return interaction.respond([]);
        }
    }


    // Run ──────────

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const { guild, member, options } = interaction;
        const query = options.getString('query', true);
        const { music } = this.container;

        // Validation ──────────

        if (!(member instanceof GuildMember) || !member.voice.channelId) {
            const errorMsg = await resolveKey(interaction, 'music:play.noChannel');
            return interaction.reply({ ...getMessageLayout(errorMsg), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        const botVoiceChannelId = guild?.members.me?.voice.channelId;
        if (botVoiceChannelId && member.voice.channelId !== botVoiceChannelId) {
            const errorMsg = await resolveKey(interaction, 'music:play.wrongChannel');
            return interaction.reply({ ...getMessageLayout(errorMsg), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        // DETECT: Is this a direct play (URL/Autocomplete selection) or a generic search (Enter a lo bruto)?
        const isUrl = query.startsWith('http');
        
        // Ephemeral for searches, public for direct play
        await interaction.deferReply(!isUrl ? { flags: ['Ephemeral'] } : undefined);

        // Search ──────────

        const node = music.options.nodeResolver(music.nodes);
        if (!node) return interaction.editReply('`❌` No Lavalink nodes available.');
        
        if (!isUrl) {
            // Generic search: Spotify-first with automatic YouTube fallback.
            const result = await resolveSearchWithFallback(this, node, query);

            if (!result || result.loadType !== 'search' || result.data.length === 0) {
                const noResultsMsg = await resolveKey(interaction, 'music:play.noResults');
                return interaction.editReply({ ...getMessageLayout(`${Emojis.error_emoji} ${noResultsMsg}`) });
            }

            const labels = {
                title: await resolveKey(interaction, 'music:labels.search'),
                placeholder: await resolveKey(interaction, 'music:labels.searchPlaceholder'),
                author: await resolveKey(interaction, 'music:labels.author'),
                album: await resolveKey(interaction, 'music:labels.album')
            };

            const previewTracks = await Promise.all(result.data.slice(0, 5).map(async (t: any) => {
                await attachExternalMetadataToTrack(t);
                const display = getTrackDisplayMetadata(t);

                return {
                    title: display.title,
                    author: display.author,
                    album: display.album || '—',
                    identifier: t.info.identifier,
                    uri: t.info.uri,
                    artworkUrl: display.artworkUrl
                };
            }));

            const layout = getSearchLayout({
                query,
                tracks: previewTracks,
                labels
            });

            return interaction.editReply(layout as any);
        }

        // Direct Resolve (URL / Autocomplete selection)
        // Join voice and resolve the track in parallel — whichever finishes last wins
        const existingMusicPlayer = music.queues.get(guild!.id);
        const needsJoin = !existingMusicPlayer && !music.players.get(guild!.id);

        const [result, earlyPlayer] = await Promise.all([
            resolveWithSpotifyFallback(this, node, query),
            needsJoin
                ? music.joinVoiceChannel({
                    guildId: guild!.id,
                    channelId: member.voice.channelId,
                    shardId: guild!.shardId,
                    deaf: true
                }).catch(() => null)
                : Promise.resolve(null)
        ]);

        this.container.logger.info(`[MUSIC] Direct resolve for "${query}": ${result?.loadType}`);

        if (!result || result.loadType === 'empty') {
            const errorMsg = await resolveKey(interaction, 'music:play.noResults');
            return interaction.editReply({ ...getMessageLayout(errorMsg) });
        }

        if (result.loadType === 'error') {
            this.container.logger.error(`[MUSIC] Lavalink search error: ${JSON.stringify(result.data)}`);
            return interaction.editReply('`❌` Lavalink encountered an error while searching.');
        }

        // Get or Create Player ──────────

        let musicPlayer = existingMusicPlayer;
        if (!musicPlayer) {
            const player = earlyPlayer ?? music.players.get(guild!.id);
            if (!player) return interaction.editReply('`❌` Could not connect to voice channel.');
            musicPlayer = new MusicPlayer(guild!.id, player);
            music.queues.set(guild!.id, musicPlayer);
        }

        musicPlayer.textChannelId = interaction.channelId;

        // Process Results ──────────

        if (result.loadType === 'playlist') {
            const playlist = result.data as any;
            const tracks = playlist.tracks;
            for (const track of tracks) {
                (track as any).requestedBy = interaction.user.id;
                musicPlayer.queue.push(track);
            }
            const msg = await resolveKey(interaction, 'music:play.playlistLoaded', { count: tracks.length, name: playlist.info.name });
            await interaction.editReply({ ...getMessageLayout(`${Emojis.check_emoji} ${msg}`) });
        } else if (result.loadType === 'search' || result.loadType === 'track') {
            const tracks = Array.isArray(result.data) ? result.data : [result.data];

            if (result.loadType === 'search' && isSpotifyCollectionUrl(query)) {
                const fallbackTracks = tracks.slice(0, 10);

                for (const t of fallbackTracks) {
                    if (!t || !(t as any).info) continue;
                    (t as any).requestedBy = interaction.user.id;
                    await attachExternalMetadataToTrack(t as any, query);
                    musicPlayer.queue.push(t as any);
                }

                const msg = await resolveKey(interaction, 'music:play.playlistLoaded', {
                    count: fallbackTracks.length,
                    name: await resolveKey(interaction, 'music:play.spotifyFallbackName')
                });
                await interaction.editReply({ ...getMessageLayout(`${Emojis.check_emoji} ${msg}`) });

                if (!musicPlayer.current) {
                    this.container.logger.info(`🎵 [MUSIC] Triggering playNext from Spotify collection fallback for ${guild!.id}`);
                    await musicPlayer.playNext();
                }

                return;
            }

            const track = tracks[0] as any;

            if (!track || !track.info) {
                const errorMsg = await resolveKey(interaction, 'music:play.noResults');
                return interaction.editReply({ ...getMessageLayout(errorMsg) });
            }

            track.requestedBy = interaction.user.id;
            musicPlayer.queue.push(track);

            const cleanedTitle = cleanTrackTitle(track.info.title, track.info.author);
            const duration = formatDuration(track.info.length ?? 0);
            const msg = await resolveKey(interaction, 'music:play.loaded', { title: `${cleanedTitle} - \`${duration}\`` });
            await interaction.editReply({ ...getMessageLayout(`${Emojis.check_emoji} ${msg}`) });
        }

        // Play if not playing ──────────

        if (!musicPlayer.current) {
            this.container.logger.info(`🎵 [MUSIC] Triggering playNext from command for ${guild!.id}`);
            await musicPlayer.playNext();

            // Fetch external metadata for the track that just became current and refresh the layout.
            // Only done here (not when queuing into an already-playing session) to avoid spurious edits.
            const nowCurrent = musicPlayer.current;
            if (nowCurrent && !(nowCurrent as any).displayMetadata) {
                attachExternalMetadataToTrack(nowCurrent as any, query).then(() => {
                    if (musicPlayer!.current?.info?.identifier === nowCurrent.info?.identifier) {
                        musicPlayer!.refresh().catch(() => null);
                    }
                }).catch(() => null);
            }
        }
    }
}

