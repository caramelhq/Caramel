import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { StringSelectMenuInteraction, GuildMember } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../lib/layouts/defaultLayout';
import { Emojis } from '../lib/constants/emojis';
import { cleanTrackTitle } from '../lib/utils/MusicUtils';
import { MusicPlayer } from '../lib/structures/MusicPlayer';
import { attachExternalMetadataToTrack, getTrackDisplayMetadata } from '../lib/utils/TrackMetadataResolver';

export class SearchSelectorHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.SelectMenu
        });
    }

    public override parse(interaction: StringSelectMenuInteraction) {
        if (interaction.customId !== 'music_search_selector') return this.none();
        return this.some();
    }

    public async run(interaction: StringSelectMenuInteraction) {
        const { guild, member, values, user } = interaction;
        const { music } = this.container;

        if (!(member instanceof GuildMember) || !member.voice.channelId) {
            const errorMsg = await resolveKey(interaction, 'music:play.noChannel');
            return interaction.reply({ ...getMessageLayout(errorMsg), flags: ['Ephemeral', 'IsComponentsV2'] });
        }

        // Selected value format: search_select_<identifier>
        const identifier = values[0].replace('search_select_', '');
        
        // Acknowledge the interaction
        await interaction.deferUpdate();

        const node = music.options.nodeResolver(music.nodes);
        if (!node) return;

        // Resolve selected track from Spotify-first search, with YouTube fallback.
        const result =
            await node.rest.resolve(`https://open.spotify.com/track/${identifier}`).catch(() => null)
            ?? await node.rest.resolve(`https://www.youtube.com/watch?v=${identifier}`).catch(() => null);
        if (!result || result.loadType !== 'track') return;

        const track = result.data;
        await attachExternalMetadataToTrack(track);
        (track as any).requestedBy = user.id;

        // Get or Create Player ──────────
        let musicPlayer = music.queues.get(guild!.id);
        if (!musicPlayer) {
            let player = music.players.get(guild!.id);
            if (!player) {
                player = await music.joinVoiceChannel({
                    guildId: guild!.id,
                    channelId: member.voice.channelId,
                    shardId: guild!.shardId,
                    deaf: true
                });
            }
            musicPlayer = new MusicPlayer(guild!.id, player);
            music.queues.set(guild!.id, musicPlayer);
        }

        musicPlayer.textChannelId = interaction.channelId;
        
        // If nothing is playing, play immediately via playNext so Spotify tracks get resolved
        if (!musicPlayer.current) {
            musicPlayer.queue.unshift(track);
            await musicPlayer.playNext();
        } else {
            musicPlayer.queue.push(track);
            await musicPlayer.saveState();
        }

        const display = getTrackDisplayMetadata(track);
        const addedMsg = await resolveKey(interaction, 'music:play.loaded', { replace: { title: cleanTrackTitle(display.title, display.author) } });
        
        // Delete the ephemeral search menu
        await interaction.deleteReply().catch(() => null);

        // Send a PUBLIC confirmation message to the channel
        const channel = interaction.channel;
        if (channel && 'send' in channel) {
            await channel.send(getMessageLayout(`${Emojis.check_emoji} ${addedMsg}`) as any);
        }
    }
}
