import { Command } from '@sapphire/framework';
import { GuildMember } from 'discord.js';
import { getMessageLayout } from '../../lib/layouts/defaultLayout';
import { resolveKey } from '@sapphire/plugin-i18next';
import { Emojis } from '../../lib/constants/emojis';
import { MusicPlayer } from '../../lib/structures/MusicPlayer';
import { cleanTrackTitle, formatDuration } from '../../lib/utils/MusicUtils';


// Play command ──────────────────

export class PlayCommand extends Command {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'play',
            description: 'Search and play music from YouTube',
            preconditions: ['GuildOnly'],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addStringOption((option) =>
                    option
                        .setName('query')
                        .setDescription('Track name or URL')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        );
    }


    // Autocomplete ──────────

    public override async autocompleteRun(interaction: Command.AutocompleteInteraction) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name !== 'query') return interaction.respond([]);

        const { user } = interaction;
        const query = focusedOption.value;

        try {
            // 1. Fetch user favorites that match the query
            const favorites = await this.container.db.userFavorite.findMany({
                where: {
                    userId: user.id,
                    ...(query ? {
                        OR: [
                            { trackTitle: { contains: query, mode: 'insensitive' } },
                            { author: { contains: query, mode: 'insensitive' } }
                        ]
                    } : {})
                },
                take: 10,
                orderBy: { createdAt: 'desc' }
            });

            // 2. Fetch YouTube results via Lavalink if there is a query
            let ytResults: any[] = [];
            if (query && query.length > 2) {
                const node = this.container.music.options.nodeResolver(this.container.music.nodes);
                if (node) {
                    const result = await node.rest.resolve(`ytsearch:${query}`);
                    if (result && result.loadType === 'search') {
                        ytResults = Array.isArray(result.data) ? result.data : [];
                    }
                }
            }

            // 3. Combine and filter duplicates (by URL)
            const favoriteUrls = new Set(favorites.map(f => f.trackUrl));
            const finalResults: { name: string, value: string }[] = [];

            // Add favorites first with heart
            for (const fav of favorites) {
                const title = fav.trackTitle.length > 50 ? `${fav.trackTitle.substring(0, 47)}...` : fav.trackTitle;
                const author = fav.author.length > 30 ? `${fav.author.substring(0, 27)}...` : fav.author;
                finalResults.push({
                    name: `❤️ ${title} - ${author}`,
                    value: fav.trackUrl
                });
            }

            // Add YT results (if they aren't already in favorites)
            for (const track of ytResults) {
                if (finalResults.length >= 25) break;
                if (favoriteUrls.has(track.info.uri)) continue;

                const cleanTitle = cleanTrackTitle(track.info.title, track.info.author);
                const title = cleanTitle.length > 50 ? `${cleanTitle.substring(0, 47)}...` : cleanTitle;
                const author = track.info.author.length > 30 ? `${track.info.author.substring(0, 27)}...` : track.info.author;

                finalResults.push({
                    name: `🎵 ${title} - ${author}`,
                    value: track.info.uri
                });
            }

            return interaction.respond(finalResults.slice(0, 25));
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
            return interaction.reply({ ...getMessageLayout(errorMsg), ephemeral: true });
        }

        const botVoiceChannelId = guild?.members.me?.voice.channelId;
        if (botVoiceChannelId && member.voice.channelId !== botVoiceChannelId) {
            const errorMsg = await resolveKey(interaction, 'music:play.wrongChannel');
            return interaction.reply({ ...getMessageLayout(errorMsg), ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: false });

        // Search ──────────

        const node = music.options.nodeResolver(music.nodes);
        if (!node) return interaction.editReply('`❌` No Lavalink nodes available.');

        const result = await node.rest.resolve(query.startsWith('http') ? query : `ytsearch:${query}`);
        
        this.container.logger.info(`[MUSIC] Search result for "${query}": ${result?.loadType}`);

        if (!result || result.loadType === 'empty') {
            const errorMsg = await resolveKey(interaction, 'music:play.noResults');
            return interaction.editReply({ ...getMessageLayout(errorMsg) });
        }

        if (result.loadType === 'error') {
            this.container.logger.error(`[MUSIC] Lavalink search error: ${JSON.stringify(result.data)}`);
            return interaction.editReply('`❌` Lavalink encountered an error while searching.');
        }

        // Get or Create Player ──────────

        let musicPlayer = music.queues.get(guild!.id);
        if (!musicPlayer) {
            const player = await music.joinVoiceChannel({
                guildId: guild!.id,
                channelId: member.voice.channelId,
                shardId: guild!.shardId,
                deaf: false
            });

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
        } else {
            const errorMsg = await resolveKey(interaction, 'music:play.noResults');
            return interaction.editReply({ ...getMessageLayout(errorMsg) });
        }

        // Play if not playing ──────────

        if (!musicPlayer.current) {
            this.container.logger.info(`🎵 [MUSIC] Triggering playNext from command for ${guild!.id}`);
            await musicPlayer.playNext();
        }
    }
}
