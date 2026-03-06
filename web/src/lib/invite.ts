const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? "";

export function getBotInviteUrl(guildId?: string) {
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("permissions", "8");
    url.searchParams.set("integration_type", "0");
    url.searchParams.set("scope", "applications.commands bot");
    if (guildId) url.searchParams.set("guild_id", guildId);
    return url.toString();
}
