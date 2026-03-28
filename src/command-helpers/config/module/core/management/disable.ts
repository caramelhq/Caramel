import { Subcommand } from '@sapphire/plugin-subcommands';
import { resolveKey } from '@sapphire/plugin-i18next';
import { prisma } from '../../../../../database/db';
import { CacheManager } from '../../../../../database/CacheManager';
import { getStatusUpdateLayout } from '../../../../../lib/layouts/modCommandLayouts';
import { getMessageLayout } from '../../../../../lib/layouts/defaultLayout';
import { getDisplayNameKey, moduleIds, moduleOptionName } from '../constants';
import { getLogsGuildConfig, setLogsGuildConfig } from '../../../../../lib/logging/configStore';

export async function handleDisable(interaction: Subcommand.ChatInputCommandInteraction) {
    const { guildId, options } = interaction;
    const moduleValue = options.getString(moduleOptionName, true);
    const displayName = await resolveKey(interaction, getDisplayNameKey(moduleValue));

    await interaction.deferReply();

    const config = await prisma.guildConfig.findUnique({ where: { guildId: guildId! } });
    const configKey = (moduleValue === moduleIds.automod ? 'automodModule' : `${moduleValue}Module`) as keyof typeof config;

    if (moduleValue === moduleIds.logs) {
        const logsConfig = await getLogsGuildConfig(guildId!);
        if (!logsConfig.enabled) {
            const alreadyDisabled = await resolveKey(interaction, 'modules:module.alreadyDisabled', { name: displayName });
            return interaction.editReply({ ...getMessageLayout(alreadyDisabled) });
        }

        await setLogsGuildConfig(guildId!, { ...logsConfig, enabled: false });
        const disableSuccess = await resolveKey(interaction, 'modules:module.disableSuccess', { name: displayName });
        return interaction.editReply(getStatusUpdateLayout(displayName, disableSuccess, false));
    }

    if (config && (config as any)[configKey] === false) {
        const alreadyDisabled = await resolveKey(interaction, 'modules:module.alreadyDisabled', { name: displayName });
        return interaction.editReply({ ...getMessageLayout(alreadyDisabled) });
    }

    const updated = await prisma.guildConfig.update({
        where: { guildId: guildId! },
        data: { [configKey]: false }
    });
    await CacheManager.syncGuild(guildId!, updated);

    const disableSuccess = await resolveKey(interaction, 'modules:module.disableSuccess', { name: displayName });
    return interaction.editReply(getStatusUpdateLayout(displayName, disableSuccess, false));
}
