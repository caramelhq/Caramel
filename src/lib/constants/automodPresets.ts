import { AutoModerationRuleEventType, AutoModerationRuleTriggerType, AutoModerationActionType, AutoModerationRuleCreateOptions } from 'discord.js';

export interface AutoModPreset {
    id: string; // unique internal id
    language: 'en' | 'es';
    level: 1 | 2 | 3; // 1: Low, 2: Medium, 3: High
    topic: string; // e.g. 'bad-words', 'spam', 'links'
    description: string;
    rules: AutoModerationRuleCreateOptions[];
}

export const AutoModPresets: AutoModPreset[] = [
    // ─────────────────────────────────────────────────────────────
    // ENGLISH PRESETS
    // ─────────────────────────────────────────────────────────────

    // LOW: Basic Profanity (Native) ──────────
    {
        id: 'en-low-badwords',
        language: 'en',
        level: 1,
        topic: 'bad-words',
        description: 'Basic profanity filter using Discord native lists.',
        rules: [
            {
                name: 'Basic Profanity Filter',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                triggerMetadata: {
                    presets: [1], // PROFANITY
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            }
        ]
    },

    // MEDIUM: Standard Anti-Spam ──────────
    {
        id: 'en-med-spam',
        language: 'en',
        level: 2,
        topic: 'spam',
        description: 'Standard protection against flood and spam.',
        rules: [
            {
                name: 'Anti-Spam Standard',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.Spam,
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            }
        ]
    },

    // HIGH: Strict Filter & Anti-Raid ──────────
    {
        id: 'en-high-protection',
        language: 'en',
        level: 3,
        topic: 'strict-protection',
        description: 'Comprehensive protection: Slurs, Invites, and Mention Spams.',
        rules: [
            {
                name: 'Strict Profanity & Slurs',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                triggerMetadata: {
                    presets: [1, 2, 3], // PROFANITY, SEXUAL_CONTENT, SLURS
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            },
            {
                name: 'Anti-Invite Links',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: {
                    regexPatterns: ['(https?://)?(www\\.)?(discord\\.(gg|io|me|li)|discordapp\\.com/invite)/.+[a-z]']
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            },
            {
                name: 'Anti-Raid Mentions',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.MentionSpam,
                triggerMetadata: {
                    mentionTotalLimit: 5
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage },
                    { type: AutoModerationActionType.Timeout, metadata: { durationSeconds: 60 } }
                ],
                enabled: true
            }
        ]
    },


    // ─────────────────────────────────────────────────────────────
    // SPANISH PRESETS
    // ─────────────────────────────────────────────────────────────

    // LOW: Groserías Básicas (Nativo) ──────────
    {
        id: 'es-low-groserias',
        language: 'es',
        level: 1,
        topic: 'groserias',
        description: 'Filtro básico de groserías usando listas nativas.',
        rules: [
            {
                name: 'Filtro Groserías Básico',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                triggerMetadata: {
                    presets: [1], // PROFANITY
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            }
        ]
    },

    // MEDIUM: Anti-Spam Estándar ──────────
    {
        id: 'es-med-spam',
        language: 'es',
        level: 2,
        topic: 'spam',
        description: 'Protección estándar contra flood y spam repetitivo.',
        rules: [
            {
                name: 'Anti-Spam Estándar',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.Spam,
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            }
        ]
    },

    // HIGH: Protección Total (Links, Odio, Raids) ──────────
    {
        id: 'es-high-proteccion',
        language: 'es',
        level: 3,
        topic: 'proteccion-total',
        description: 'Pack completo: Insultos graves, Invitaciones y Menciones masivas.',
        rules: [
            {
                name: 'Filtro Estricto & Odio',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.KeywordPreset,
                triggerMetadata: {
                    presets: [1, 2, 3], // PROFANITY, SEXUAL_CONTENT, SLURS
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            },
            {
                name: 'Anti-Links Invitaciones',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.Keyword,
                triggerMetadata: {
                    regexPatterns: ['(https?://)?(www\\.)?(discord\\.(gg|io|me|li)|discordapp\\.com/invite)/.+[a-z]']
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage }
                ],
                enabled: true
            },
            {
                name: 'Anti-Raid Menciones',
                eventType: AutoModerationRuleEventType.MessageSend,
                triggerType: AutoModerationRuleTriggerType.MentionSpam,
                triggerMetadata: {
                    mentionTotalLimit: 5
                },
                actions: [
                    { type: AutoModerationActionType.BlockMessage },
                    { type: AutoModerationActionType.Timeout, metadata: { durationSeconds: 60 } }
                ],
                enabled: true
            }
        ]
    }
];
