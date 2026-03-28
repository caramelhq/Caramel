import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ButtonInteraction, GuildMember } from "discord.js";
import { resolveKey } from "@sapphire/plugin-i18next";
import { getMessageLayout } from "../lib/layouts/defaultLayout";
import { Emojis } from "../lib/constants/emojis";
import { CacheManager } from "../database/CacheManager";
import { formatDuration } from "../lib/utils/MusicUtils";
import { MusicUiTtlMs } from "../lib/constants/musicUi";

// Music button handler ──────────────────

export class MusicButtonHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("music_")) return this.none();

    // Ignore lyrics buttons as they are handled by the command's collector
    if (interaction.customId.startsWith("music_lyrics_")) return this.none();

    return this.some();
  }

  public async run(interaction: ButtonInteraction) {
    const { guild, member, customId, user } = interaction;
    const { music } = this.container;
    const musicPlayer = music.queues.get(guild!.id);

    const asEphemeralLayout = (layout: any) => ({
      ...layout,
      flags: ["Ephemeral", "IsComponentsV2"],
    });

    const isSessionNotFoundError = (error: unknown) => {
      const message = (error as any)?.message ?? "";
      return (
        typeof message === "string" && message.includes("Session not found")
      );
    };

    const recoverStalePlayerSession = async () => {
      if (!musicPlayer) return;

      musicPlayer.queue = [];
      musicPlayer.loop = false;
      musicPlayer.autoplay = false;

      await musicPlayer.deleteLastMessage().catch(() => null);
      musicPlayer.dispose();
      await music.leaveVoiceChannel(guild!.id).catch(() => null);
      music.queues.delete(guild!.id);

      const staleMsg =
        "`⚠️` The music session expired after reconnect. Use `/play` to start again.";
      if (!interaction.deferred && !interaction.replied) {
        await interaction
          .update(getMessageLayout(staleMsg) as any)
          .catch(async () => {
            await interaction
              .reply(asEphemeralLayout(getMessageLayout(staleMsg)))
              .catch(() => null);
          });
      } else {
        await interaction
          .followUp(asEphemeralLayout(getMessageLayout(staleMsg)))
          .catch(() => null);
      }
    };

    // Validation ──────────

    if (!musicPlayer) {
      return interaction.reply(
        asEphemeralLayout(getMessageLayout("`❌` No active player found.")),
      );
    }

    if (
      !(member instanceof GuildMember) ||
      member.voice.channelId !== guild?.members.me?.voice.channelId
    ) {
      const errorMsg = await resolveKey(interaction, "music:play.wrongChannel");
      return interaction.reply(asEphemeralLayout(getMessageLayout(errorMsg)));
    }

    // Logic per button ──────────

    switch (customId) {
      case "music_pause":
        try {
          await musicPlayer.player.setPaused(!musicPlayer.player.paused);
        } catch (err) {
          if (isSessionNotFoundError(err)) return recoverStalePlayerSession();
          throw err;
        }
        break;

      case "music_skip":
        try {
          if (musicPlayer.loop && musicPlayer.current) {
            await musicPlayer.player.playTrack({
              track: { encoded: (musicPlayer.current as any).encoded },
            });
            return interaction.deferUpdate();
          }
          await musicPlayer.player.stopTrack();
          return interaction.deferUpdate();
        } catch (err) {
          if (isSessionNotFoundError(err)) return recoverStalePlayerSession();
          throw err;
        }

      case "music_loop":
        musicPlayer.loop = !musicPlayer.loop;
        break;

      case "music_favorite":
        const currentTrack = musicPlayer.current;
        if (!currentTrack || !currentTrack.info.uri) break;

        // Restriction: Only the person who requested the track can favorite it
        const requesterId = (currentTrack as any).requestedBy;
        if (requesterId && user.id !== requesterId) {
          const onlyRequesterMsg = await resolveKey(
            interaction,
            "music:play.onlyRequester",
          );
          return interaction.reply(
            asEphemeralLayout(
              getMessageLayout(`${Emojis.cross_emoji} ${onlyRequesterMsg}`),
            ),
          );
        }

        try {
          // Acknowledge the interaction immediately to prevent timeouts
          await interaction.deferUpdate();

          const existing = await this.container.db.userFavorite.findUnique({
            where: {
              userId_trackUrl: {
                userId: user.id,
                trackUrl: currentTrack.info.uri,
              },
            },
          });

          if (existing) {
            await this.container.db.userFavorite.delete({
              where: { id: existing.id },
            });
            await CacheManager.invalidateUserFavorites(user.id);
            const removedMsg = await resolveKey(
              interaction,
              "music:controls.favoriteRemoved",
            );
            await interaction.followUp(
              asEphemeralLayout(
                getMessageLayout(`${Emojis.check_emoji} ${removedMsg}`),
              ),
            );
          } else {
            const count = await this.container.db.userFavorite.count({
              where: { userId: user.id },
            });
            if (count >= 10) {
              const limitMsg = await resolveKey(
                interaction,
                "music:controls.favoriteLimit",
              );
              await interaction.followUp(
                asEphemeralLayout(
                  getMessageLayout(`${Emojis.error_emoji} ${limitMsg}`),
                ),
              );
              return;
            }

            await this.container.db.userFavorite.create({
              data: {
                userId: user.id,
                trackTitle: currentTrack.info.title,
                trackUrl: currentTrack.info.uri,
                author: currentTrack.info.author,
                trackDuration: formatDuration(currentTrack.info.length ?? 0),
              },
            });
            await CacheManager.invalidateUserFavorites(user.id);
            const addedMsg = await resolveKey(
              interaction,
              "music:controls.favoriteAdded",
            );
            await interaction.followUp(
              asEphemeralLayout(
                getMessageLayout(`${Emojis.favorite_song_emoji} ${addedMsg}`),
              ),
            );
          }
        } catch (err) {
          this.container.logger.error(
            "[MUSIC_HANDLER] Error handling favorite:",
            err,
          );
        }
        break;

      case "music_stop":
        musicPlayer.queue = [];
        musicPlayer.loop = false;
        musicPlayer.autoplay = false;
        try {
          await musicPlayer.player.stopTrack();
        } catch (err) {
          if (isSessionNotFoundError(err)) return recoverStalePlayerSession();
          throw err;
        }
        musicPlayer.dispose();

        await music.leaveVoiceChannel(guild!.id);
        music.queues.delete(guild!.id);

        return interaction.deferUpdate().catch(() => null);

      case "music_queue":
        try {
          if (musicPlayer.queue.length === 0) {
            const emptyMsg = await resolveKey(interaction, "music:queue.empty");
            return await interaction.reply(
              asEphemeralLayout(getMessageLayout(emptyMsg)),
            );
          }
          const qLayout = await musicPlayer.buildQueueLayout(guild!, 1);
          await interaction.deferReply({
            flags: ["Ephemeral", "IsComponentsV2"] as any,
          });
          await interaction.editReply({
            components: (qLayout as any)?.components ?? [],
          } as any);

          setTimeout(() => {
            interaction.deleteReply().catch(() => null);
          }, MusicUiTtlMs.queueEphemeral);
        } catch (err) {
          if ((err as any).code !== 10062 && (err as any).code !== 40060) {
            this.container.logger.error(
              "[MUSIC_HANDLER] Error in queue button:",
              err,
            );
          }
        }
        return;
    }

    // Pagination for queue ──────────

    if (
      customId.startsWith("music_queue_prev_") ||
      customId.startsWith("music_queue_next_")
    ) {
      const parts = customId.split("_");
      const currentPage = parseInt(parts[parts.length - 1]);
      const newPage = customId.includes("prev")
        ? currentPage - 1
        : currentPage + 1;

      const layout = await musicPlayer.buildQueueLayout(guild!, newPage);
      if (layout) return interaction.update(layout as any);
    }

    // Update the main UI message ──────────
    try {
      // Determine if we should show buttons based on the current interaction
      const showButtons = !customId.includes("favorite");

      // If the interaction hasn't been handled yet, we need to update it
      if (!interaction.replied && !interaction.deferred) {
        const layout = await musicPlayer.buildLayout(
          guild!,
          user.id,
          showButtons,
        );
        if (layout) {
          await interaction.update(layout as any);
        } else {
          // If no layout (track ended), send a simple message instead of empty deferUpdate
          const endMsg = await resolveKey(interaction, "music:controls.stop");
          await interaction.update(
            getMessageLayout(`${Emojis.check_emoji} ${endMsg}`) as any,
          );
        }
      } else if (interaction.replied || interaction.deferred) {
        // If we already replied (like in favorite followUp), we edit the message instead of update
        const layout = await musicPlayer.buildLayout(
          guild!,
          user.id,
          showButtons,
        );
        if (layout) {
          await interaction.editReply(layout as any);
        } else {
          const endMsg = await resolveKey(interaction, "music:controls.stop");
          await interaction.editReply(
            getMessageLayout(`${Emojis.check_emoji} ${endMsg}`) as any,
          );
        }
      }
    } catch (err) {
      if (
        (err as any).code !== 10062 &&
        (err as any).code !== 50035 &&
        (err as any).code !== 50006
      ) {
        this.container.logger.error(
          "[MUSIC_HANDLER] Error updating interaction:",
          err,
        );
      }
    }
  }
}
