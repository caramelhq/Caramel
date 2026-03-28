import autoModCommandsEnUs from '../../../lib/i18n/en-US/automodcommands.json';

export const SINGULAR_TRIGGER_TYPES = new Set<number>([3, 4, 5, 6]);

export function getTriggerTypeLabel(type: number): string {
    const map: Record<number, string> = {
        1: autoModCommandsEnUs.meta.trigger.keyword,
        2: autoModCommandsEnUs.meta.trigger.spam,
        3: autoModCommandsEnUs.meta.trigger.mlSpam,
        4: autoModCommandsEnUs.meta.trigger.keywordPreset,
        5: autoModCommandsEnUs.meta.trigger.mentionSpam
    };

    return map[type] || autoModCommandsEnUs.meta.trigger.unknown;
}

export function getActionTypeLabel(type: number): string {
    const map: Record<number, string> = {
        1: autoModCommandsEnUs.meta.action.block,
        2: autoModCommandsEnUs.meta.action.alert,
        3: autoModCommandsEnUs.meta.action.timeout
    };

    return map[type] || autoModCommandsEnUs.meta.action.unknown;
}

export function getPresetLabel(preset: number): string {
    const map: Record<number, string> = {
        1: autoModCommandsEnUs.meta.preset.profanity,
        2: autoModCommandsEnUs.meta.preset.sexualContent,
        3: autoModCommandsEnUs.meta.preset.slurs
    };

    return map[preset] || autoModCommandsEnUs.meta.preset.fallback.replace('{{value}}', String(preset));
}
