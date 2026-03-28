// User-facing ephemeral response lifetimes.
export const MusicUiTtlMs = {
    nowPlayingEphemeral: 15_000,
    queueEphemeral: 30_000
} as const;

// Playback engine timings.
export const MusicPlayerTimingMs = {
    persistenceHeartbeat: 15_000,
    idleDisconnect: 180_000,
    playNextRetryDelay: 1_000
} as const;

// Redis TTLs for persisted playback state.
export const MusicStateTtlSeconds = {
    playerState: 3_600
} as const;

// Redis TTLs for music-related cache entries.
export const MusicCacheTtlSeconds = {
    userFavorites: 86_400,
    searchResults: 300
} as const;
