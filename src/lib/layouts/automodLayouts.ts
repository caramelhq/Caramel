import { Emojis } from '../constants/emojis';
import { ContainerComponent, TextDisplayComponent, SeparatorComponent, SectionComponent, ButtonComponent } from './ui';

/**
 * Layout for AutoMod module management
 */
export function getAutoModLayout(data: {
    title: string;
    description: string;
    rules?: any[];
}) {
    return {
        flags: 32768,
        components: [
            ContainerComponent([
                SectionComponent([
                    TextDisplayComponent(`### ${data.title}\n${data.description}`)
                ]),
                ...(data.rules?.length ? [
                    SeparatorComponent(1, true),
                    TextDisplayComponent(data.rules.map(r => 
                        `${r.enabled ? Emojis.enabled_setting_emoji : Emojis.disabled_setting_emoji} **${r.name}** (\`${r.type}\`) - *Action: ${r.action}*`
                    ).join('\n'))
                ] : [])
            ])
        ]
    };
}

/**
 * Rich Preview Layout for Preset Import
 */
export function getAutoModPreviewLayout(data: {
    title: string;
    rules: { name: string, status: 'enabled' | 'disabled' | 'error', message: string }[];
    editId: string;
}) {
    const validCount = data.rules.filter(r => r.status === 'enabled').length;
    const errorCount = data.rules.filter(r => r.status === 'error').length;
    
    // Header Section with Edit Button
    const header = SectionComponent(
        [TextDisplayComponent(`${Emojis.check_emoji} **Found ${data.rules.length} AutoMod Rules**`)],
        ButtonComponent(data.editId, 'Edit Imports', 2, undefined, false) // 2 = Secondary Style
    );

    // Rule Status Lines
    const ruleLines = data.rules.map(r => {
        let emoji: string = Emojis.bullet_emoji;
        if (r.status === 'enabled') emoji = Emojis.enabled_setting_emoji;
        if (r.status === 'disabled') emoji = Emojis.bullet_emoji; // Or disabled emoji if preferred
        if (r.status === 'error') emoji = Emojis.disabled_setting_emoji;

        return TextDisplayComponent(`${emoji} ${r.message}`);
    });

    const footer = TextDisplayComponent(`-# Rules that surpass discord limits will be ignored when importing.`);

    return {
        flags: 32768,
        components: [
            ContainerComponent([
                header,
                SeparatorComponent(),
                ...ruleLines,
                SeparatorComponent(),
                footer
            ])
        ]
    };
}

/**
 * Layout for the AutoMod Preset Import UI (Deprecated/Fallback)
 */
export function getAutoModImportLayout(data: {
    currentRules: number;
    presetRules: number;
    canImport: boolean;
    language: string;
    level: number;
    topic?: string;
}) {
    const total = data.currentRules + data.presetRules;
    const isOverLimit = total > 100;
    const accentColor = isOverLimit ? 0xFF5252 : 0x4CAF50;

    return {
        flags: 32768,
        components: [
            ContainerComponent([
                SectionComponent([
                    TextDisplayComponent(
                        `### ${Emojis.static_setting_emoji} AutoMod Preset: ${data.topic || 'Selection'}\n` +
                        `Checking available space in your server...\n\n` +
                        `• Current Rules: **${data.currentRules}/100**\n` +
                        `• Preset Rules: **+${data.presetRules}**\n` +
                        `• Total: **${total}/100** ${isOverLimit ? Emojis.cross_emoji : Emojis.check_emoji}`
                    )
                ]),
                SeparatorComponent(1, true),
                TextDisplayComponent(
                    isOverLimit 
                        ? `${Emojis.warning_emoji} **Insufficient Space.** Please delete at least **${total - 100}** rules before applying this preset.`
                        : `${Emojis.check_emoji} Space verified. You can proceed with the import.`
                )
            ], accentColor)
        ]
    };
}
