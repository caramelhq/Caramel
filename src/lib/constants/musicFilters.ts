/**
 * Presets for Lavalink filters.
 */
export const FilterPresets = {
    bassboost: {
        equalizer: [
            { band: 0, gain: 0.20 },
            { band: 1, gain: 0.15 },
            { band: 2, gain: 0.10 },
            { band: 3, gain: 0.05 }
        ]
    },
    nightcore: {
        timescale: {
            speed: 1.25,
            pitch: 1.25,
            rate: 1.0
        }
    },
    vaporwave: {
        timescale: {
            speed: 0.85,
            pitch: 0.80,
            rate: 1.0
        }
    },
    pop: {
        equalizer: [
            { band: 0, gain: -0.02 },
            { band: 1, gain: -0.01 },
            { band: 2, gain: 0.08 },
            { band: 3, gain: 0.10 },
            { band: 4, gain: 0.05 },
            { band: 5, gain: 0.0 },
            { band: 6, gain: 0.0 },
            { band: 7, gain: -0.02 },
            { band: 8, gain: -0.05 },
            { band: 9, gain: -0.05 }
        ]
    },
    soft: {
        lowPass: {
            smoothing: 20.0
        }
    }
};

export type FilterType = keyof typeof FilterPresets | 'off';
