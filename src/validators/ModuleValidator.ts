import { getLogsGuildConfig, isLogsConfigReady } from '../lib/logging/configStore';

// Types ──────────────────

export interface ValidationResult {
    isValid:       boolean;
    missing?:      string[];
    needsChannel?: boolean;
}


// Module validators ──────────────────

export const ModuleValidators: Record<string, (config: any, guild: any) => Promise<ValidationResult>> = {

    // Vanity validator ──────────

    vanity: async (config, guild) => {
        const errors: string[] = [];

        if (!config.vanityString) {
            errors.push('The **keyword** (status text) has not been configured.');
        }

        const role = config.vanityRoleId
            ? await guild.roles.fetch(config.vanityRoleId).catch(() => null)
            : null;
        if (!role) {
            errors.push('The **reward role** has not been configured or is invalid.');
        }

        const channel = config.vanityChannelId
            ? await guild.channels.fetch(config.vanityChannelId).catch(() => null)
            : null;
        if (!channel) {
            errors.push('The **log channel** has not been configured or is invalid.');
        }

        return { isValid: errors.length === 0, missing: errors };
    },

    // Clan Tag validator ──────────
    // Matching is done by guild ID — no tag string required to enable.

    clantag: async (config, guild) => {
        const errors: string[] = [];

        if (!guild.features.includes('CLAN')) {
            errors.push('This server does not have the **Clan** feature enabled.');
            return { isValid: false, missing: errors };
        }

        const role = config.clanTagRoleId
            ? await guild.roles.fetch(config.clanTagRoleId).catch(() => null)
            : null;
        if (!role) {
            errors.push('The **reward role** has not been configured or is invalid.');
        }

        const channel = config.clanTagChannelId
            ? await guild.channels.fetch(config.clanTagChannelId).catch(() => null)
            : null;
        if (!channel) {
            errors.push('The **log channel** has not been configured or is invalid.');
        }

        return { isValid: errors.length === 0, missing: errors };
    },

    // Mod validator ──────────

    mod: async (config, guild) => {
        if (!config.modLogChannelId) return { isValid: false, needsChannel: true };

        const channel = await guild.channels.fetch(config.modLogChannelId).catch(() => null);
        if (!channel) return { isValid: false, needsChannel: true };

        if (!config.mutedRoleId) return { isValid: false, missing: ['The **muted role** has not been configured.'] };

        const role = await guild.roles.fetch(config.mutedRoleId).catch(() => null);
        if (!role) return { isValid: false, missing: ['The **muted role** has not been configured or is invalid.'] };

        return { isValid: true };
    },

    // AutoMod validator ──────────

    automod: async (config, _guild) => {
        // AutoMod doesn't have strict requirements initially other than basic existence
        if (!config) return { isValid: false, missing: ['Server configuration not found. Run /module setup first.'] };
        return { isValid: true };
    },

    // Tickets validator ──────────

    tickets: async (config, guild) => {
        const errors: string[] = [];

        if (!config.ticketsPanelChannelId) {
            errors.push('The **panel channel** has not been configured.');
        } else {
            const panelCh = await guild.channels.fetch(config.ticketsPanelChannelId).catch(() => null);
            if (!panelCh) errors.push('The **panel channel** does not exist or is inaccessible.');
        }

        if (config.ticketsCategoryId) {
            const cat = await guild.channels.fetch(config.ticketsCategoryId).catch(() => null);
            if (!cat) errors.push('The configured **ticket category** does not exist.');
        }

        if (!config.ticketsSupporterRoleIds || config.ticketsSupporterRoleIds.length === 0) {
            errors.push('At least one **supporter role** must be configured.');
        }

        return { isValid: errors.length === 0, missing: errors };
    },

    // Logs validator ──────────

    logs: async (_config, guild) => {
        const logsConfig = await getLogsGuildConfig(guild.id);
        if (!isLogsConfigReady(logsConfig)) {
            return {
                isValid: false,
                missing: ['Logs routing is not configured yet. Run /module setup logs first.']
            };
        }

        return { isValid: true };
    }
};
