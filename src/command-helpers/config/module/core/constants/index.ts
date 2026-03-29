import modulesEnUs from '../../../../../lib/i18n/en-US/modules.json';
import modulesEsEs from '../../../../../lib/i18n/es-ES/modules.json';

export const moduleIds = {
    vanity: 'vanity',
    clantag: 'clantag',
    mod: 'mod',
    automod: 'automod',
    logs: 'logs'
} as const;

type ModuleId = (typeof moduleIds)[keyof typeof moduleIds];

const moduleDisplayNameLocales = {
    en: modulesEnUs.module.displayNames,
    es: modulesEsEs.module.displayNames
};

export const moduleOptionName = 'name';

export const moduleChoices = [
    {
        name: moduleDisplayNameLocales.en.vanity,
        value: moduleIds.vanity,
        nameLocalizations: { 'es-ES': moduleDisplayNameLocales.es.vanity }
    },
    {
        name: moduleDisplayNameLocales.en.clantag,
        value: moduleIds.clantag,
        nameLocalizations: { 'es-ES': moduleDisplayNameLocales.es.clantag }
    },
    {
        name: moduleDisplayNameLocales.en.mod,
        value: moduleIds.mod,
        nameLocalizations: { 'es-ES': moduleDisplayNameLocales.es.mod }
    },
    {
        name: moduleDisplayNameLocales.en.automod,
        value: moduleIds.automod,
        nameLocalizations: { 'es-ES': moduleDisplayNameLocales.es.automod }
    },
    {
        name: moduleDisplayNameLocales.en.logs,
        value: moduleIds.logs,
        nameLocalizations: { 'es-ES': moduleDisplayNameLocales.es.logs }
    }
] as const;

export const moduleDefaultGuildLocale = 'en-US';

export const moduleTimeoutsMs = {
    setupModal: 120000,
    autoModSetupModal: 60000,
    setupConfirm: 30000,
    resetConfirm: 20000
} as const;

export const moduleCollectorReasons = {
    success: 'success',
    cancelled: 'cancelled'
} as const;

export const moduleTextInputIds = {
    confirm: 'confirm',
    keyword: 'keyword',
    role: 'role',
    channel: 'channel',
    logChannel: 'log_channel',
    mutedRole: 'muted_role',
    thresholds: 'thresholds'
} as const;

export const moduleDefaults = {
    vanityChannelName: 'vanity-logs',
    clanTagChannelName: 'clantag-logs',
    modLogChannelName: 'mod-logs',
    mutedRoleName: 'Muted',
    thresholdMode: 'warns'
} as const;

export const moduleConfirmInputs = ['yes', 'si'] as const;

export function getDisplayNameKey(moduleValue: string) {
    return `modules:module.displayNames.${moduleValue as ModuleId}`;
}
