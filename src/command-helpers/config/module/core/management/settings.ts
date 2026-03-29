import { Subcommand } from '@sapphire/plugin-subcommands';
import { prisma } from '../../../../../database/db';
import { CacheManager } from '../../../../../database/CacheManager';
import { getModuleLayout } from '../../../../../lib/layouts/modCommandLayouts';
import { fetchT } from '@sapphire/plugin-i18next';
import { container } from '@sapphire/framework';
import { getDisplayNameKey, moduleDefaultGuildLocale, moduleIds, moduleOptionName } from '../constants';
import { getLogsGuildConfig } from '../../../../../lib/logging/configStore';

export async function handleSettings(interaction: Subcommand.ChatInputCommandInteraction) {
    const { guildId, options, guild } = interaction;
    const moduleValue = options.getString(moduleOptionName, true);

    await interaction.deferReply();

    let config = await prisma.guildConfig.findUnique({ where: { guildId: guildId! } });

    if (!config) {
        config = await prisma.guildConfig.create({
            data: { guildId: guildId!, locale: moduleDefaultGuildLocale }
        });
        await CacheManager.syncGuild(guildId!, config);
    }

    const t = await fetchT(interaction);
    const displayName = t(getDisplayNameKey(moduleValue));

    const labels: Record<string, string> = {
        title: t('layouts:settings.title', { name: displayName }),
        enabled: t('layouts:settings.enabled'),
        disabled: t('layouts:settings.disabled'),
        notSet: t('layouts:settings.notSet')
    };

    if (moduleValue === moduleIds.vanity) {
        labels.keyword = t('layouts:settings.vanity.keyword');
        labels.role = t('layouts:settings.vanity.role');
        labels.channel = t('layouts:settings.vanity.channel');
        labels.usersWithVanity = t('layouts:settings.vanity.usersWithVanity');
    } else if (moduleValue === moduleIds.clantag) {
        labels.role = t('layouts:settings.clantag.role');
        labels.channel = t('layouts:settings.clantag.channel');
        labels.usersWithTag = t('layouts:settings.clantag.usersWithTag');
    } else if (moduleValue === moduleIds.mod) {
        labels.logChannel = t('layouts:settings.mod.logChannel');
        labels.mutedRole = t('layouts:settings.mod.mutedRole');
        labels.thresholds = t('layouts:settings.mod.thresholds');
        labels.modeModular = t('layouts:settings.mod.modeModular');
        labels.modeAllActions = t('layouts:settings.mod.modeAllActions');
    } else if (moduleValue === moduleIds.automod) {
        labels.rulesCount = t('layouts:settings.automod.rulesCount');
    } else if (moduleValue === moduleIds.logs) {
        labels.mode = t('layouts:settings.logs.mode');
        labels.categories = t('layouts:settings.logs.categories');
        labels.categoryChannels = t('layouts:settings.logs.categoryChannels');
        labels.eventChannels = t('layouts:settings.logs.eventChannels');
    }

    container.logger.info(`[MODULE] Showing settings for ${moduleValue}. Labels:`, labels);
    const logsConfig = moduleValue === moduleIds.logs
        ? await getLogsGuildConfig(guildId!)
        : null;

    return interaction.editReply(getModuleLayout(moduleValue, config, guild!, labels, logsConfig));
}
