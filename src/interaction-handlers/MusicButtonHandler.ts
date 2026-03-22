import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, GuildMember } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../lib/layouts/defaultLayout';
import { Emojis } from '../lib/constants/emojis';


// Music button handler ──────────────────

export class MusicButtonHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith('music_')) return this.none();
        
        // Ignore lyrics buttons as they are handled by the command's collector
        if (interaction.customId.startsWith('music_lyrics_')) return this.none();
        
        return this.some();
    }

    public async run(interaction: ButtonInteraction) {
        const { guild, member, customId, user } = interaction;
        const { music } = this.container;
        const musicPlayer = music.queues.get(guild!.id);

        // Validation ──────────

        if (!musicPlayer) {
            return interaction.reply({ ...getMessageLayout('`❌` No active player found.'), ephemeral: true });
        }

        if (!(member instanceof GuildMember) || member.voice.channelId !== guild?.members.me?.voice.channelId) {
            const errorMsg = await resolveKey(interaction, 'music:play.wrongChannel');
            return interaction.reply({ ...getMessageLayout(errorMsg), ephemeral: true });
        }

        // Logic per button ──────────

        switch (customId) {
            case 'music_pause':
                await musicPlayer.player.setPaused(!musicPlayer.player.paused);
                break;

            case 'music_skip':
                await musicPlayer.player.stopTrack();
                return interaction.deferUpdate();

            case 'music_loop':
                musicPlayer.loop = !musicPlayer.loop;
                break;

            case 'music_favorite':
                const currentTrack = musicPlayer.current;
                if (!currentTrack || !currentTrack.info.uri) break;

                try {
                    const existing = await this.container.db.userFavorite.findUnique({
                        where: {
                            userId_trackUrl: {
                                userId: user.id,
                                trackUrl: currentTrack.info.uri
                            }
                        }
                    });

                    if (existing) {
                        await this.container.db.userFavorite.delete({ where: { id: existing.id } });
                        const removedMsg = await resolveKey(interaction, 'music:controls.favoriteRemoved');
                        await interaction.followUp({ ...getMessageLayout(`${Emojis.check_emoji} ${removedMsg}`), ephemeral: true });
                    } else {
                        const count = await this.container.db.userFavorite.count({ where: { userId: user.id } });
                        if (count >= 10) {
                            const limitMsg = await resolveKey(interaction, 'music:controls.favoriteLimit');
                            return interaction.reply({ ...getMessageLayout(`${Emojis.error_emoji} ${limitMsg}`), ephemeral: true });
                        }

                        await this.container.db.userFavorite.create({
                            data: {
                                userId: user.id,
                                trackTitle: currentTrack.info.title,
                                trackUrl: currentTrack.info.uri,
                                author: currentTrack.info.author
                            }
                        });
                        const addedMsg = await resolveKey(interaction, 'music:controls.favoriteAdded');
                        await interaction.followUp({ ...getMessageLayout(`${Emojis.favorite_song_emoji} ${addedMsg}`), ephemeral: true });
                    }
                } catch (err) {
                    this.container.logger.error('[MUSIC_HANDLER] Error handling favorite:', err);
                }
                break;

            case 'music_stop':
                musicPlayer.queue = [];
                musicPlayer.loop = false;
                await musicPlayer.player.stopTrack();
                
                await music.leaveVoiceChannel(guild!.id);
                music.queues.delete(guild!.id);
                
                // For stop, we can't update the message with a layout that requires 'current'
                const stopMsg = await resolveKey(interaction, 'music:controls.stop');
                return interaction.update({ ...getMessageLayout(`${Emojis.check_emoji} ${stopMsg}`), components: [] });

            case 'music_queue':
                try {
                    if (musicPlayer.queue.length === 0) {
                        const emptyMsg = await resolveKey(interaction, 'music:queue.empty');
                        return await interaction.reply({ ...getMessageLayout(emptyMsg), ephemeral: true });
                    }
                    const qLayout = await musicPlayer.buildQueueLayout(guild!, 1);
                    const qMsg = await interaction.reply({ ...(qLayout as any), fetchReply: true });
                    
                    setTimeout(() => {
                        qMsg.delete().catch(() => null);
                    }, 30000);
                } catch (err) {
                    if ((err as any).code !== 10062 && (err as any).code !== 40060) {
                        this.container.logger.error('[MUSIC_HANDLER] Error in queue button:', err);
                    }
                }
                return;
        }

        // Pagination for queue ──────────

        if (customId.startsWith('music_queue_prev_') || customId.startsWith('music_queue_next_')) {
            const parts = customId.split('_');
            const currentPage = parseInt(parts[parts.length - 1]);
            const newPage = customId.includes('prev') ? currentPage - 1 : currentPage + 1;
            
            const layout = await musicPlayer.buildQueueLayout(guild!, newPage);
            if (layout) return interaction.update(layout as any);
        }

        // Update the main UI message ──────────
        try {
            // If the interaction hasn't been handled yet, we need to update it
            if (!interaction.replied && !interaction.deferred) {
                const layout = await musicPlayer.buildLayout(guild!, user.id);
                if (layout) {
                    await interaction.update(layout as any);
                } else {
                    // Fallback if layout fails (e.g. track ended during processing)
                    await interaction.deferUpdate();
                }
            } else if (interaction.replied || interaction.deferred) {
                // If we already replied (like in favorite followUp), we edit the message instead of update
                const layout = await musicPlayer.buildLayout(guild!, user.id);
                if (layout) {
                    await interaction.editOriginal(layout as any);
                }
            }
        } catch (err) {
            if ((err as any).code !== 10062 && (err as any).code !== 50035) {
                this.container.logger.error('[MUSIC_HANDLER] Error updating interaction:', err);
            }
        }
    }
}
