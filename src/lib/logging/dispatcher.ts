import { Colors, EmbedBuilder, Guild } from "discord.js";
import { getLogEventDefinition } from "./catalog";
import { getLogsGuildConfig } from "./configStore";
import { EmitLogPayload } from "./types";

export async function emitAdvancedLog(
  guild: Guild,
  eventId: string,
  payload: EmitLogPayload,
) {
  const eventDef = getLogEventDefinition(eventId);
  if (!eventDef) return;

  const config = await getLogsGuildConfig(guild.id);
  if (!config.enabled) return;
  if (!config.enabledCategories.includes(eventDef.category)) return;

  const channelId = config.eventChannels[eventId];
  if (!channelId) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("send" in channel)) return;

  const embed = new EmbedBuilder()
    .setColor(Colors.Orange)
    .setTitle(payload.title)
    .setDescription(payload.description ?? null)
    .setTimestamp(new Date());

  if (payload.fields?.length) {
    embed.addFields(payload.fields);
  }

  if (payload.footer) {
    embed.setFooter({ text: payload.footer });
  }

  await channel.send({ embeds: [embed] }).catch(() => null);
}
