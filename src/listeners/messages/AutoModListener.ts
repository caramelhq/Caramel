import { Listener } from '@sapphire/framework';
import { Message, PermissionFlagsBits } from 'discord.js';
import { CacheManager } from '../../database/CacheManager';
import { cleanAndTokenize, sendModLog, applyMute } from '../../lib/utils/ModUtils';
import { prisma } from '../../database/db';

export class AutoModListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: 'messageCreate'
        });
    }

    public async run(message: Message) {
        // 1. Basic checks ──────────
        if (!message.guild || message.author.bot || !message.member) return;

        // 2. Module check (from cache) ──────────
        const config = await CacheManager.getAutoModConfig(message.guild.id);
        if (!config.automodModule) return;

        // 3. Admin/Mod bypass ──────────
        if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

        // 4. Fetch rules (from cache) ──────────
        const rules = await CacheManager.getAutoModRules(message.guild.id);
        if (!rules.length) return;

        // 5. Text processing ──────────
        const tokens = cleanAndTokenize(message.content);
        if (!tokens.length && message.content.length > 0) return; // Only symbols

        // 6. Rule Evaluation ──────────
        for (const rule of rules) {
            let triggered = false;

            if (rule.type === 'WORDS') {
                // Check each token against the Redis set for this rule
                for (const token of tokens) {
                    const isBanned = await CacheManager.isBannedWord(message.guild.id, rule.id, token);
                    if (isBanned) {
                        triggered = true;
                        break;
                    }
                }
            } else if (rule.type === 'INVITES') {
                const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/i;
                if (inviteRegex.test(message.content)) triggered = true;
            } else if (rule.type === 'LINKS') {
                const urlRegex = /https?:\/\/[^\s]+/i;
                if (urlRegex.test(message.content)) triggered = true;
            }

            if (triggered) {
                return this.applyAction(message, rule);
            }
        }
    }

    /**
     * Applies the configured action for a triggered rule
     */
    private async applyAction(message: Message, rule: any) {
        const { guild, author, member } = message;
        const reason = `AutoMod: Triggered rule [${rule.name}]`;

        // 1. Delete message if action is not ALERT ──────────
        if (rule.action !== 'ALERT') {
            await message.delete().catch(() => null);
        }

        // 2. Apply sanction ──────────
        switch (rule.action) {
            case 'TIMEOUT':
                if (member?.manageable) {
                    await applyMute({
                        guildId: guild!.id,
                        userId: author.id,
                        userTag: author.tag,
                        moderatorId: this.container.client.user!.id,
                        guild: guild!,
                        reason,
                        duration: '10m', // Default AutoMod timeout
                        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                        isAutomatic: true
                    });
                }
                break;

            case 'KICK':
                if (member?.kickable) {
                    await member.kick(reason);
                    await sendModLog({
                        guildId: guild!.id,
                        userId: author.id,
                        userTag: author.tag,
                        moderatorId: this.container.client.user!.id,
                        guild: guild!,
                        action: 'kick',
                        reason,
                        isAutomatic: true
                    });
                }
                break;

            case 'BAN':
                if (member?.bannable) {
                    await member.ban({ reason });
                    await sendModLog({
                        guildId: guild!.id,
                        userId: author.id,
                        userTag: author.tag,
                        moderatorId: this.container.client.user!.id,
                        guild: guild!,
                        action: 'ban',
                        reason,
                        isAutomatic: true
                    });
                }
                break;

            case 'DELETE':
            case 'ALERT':
                // For simple delete or alert, we just log it if a log channel is set
                await sendModLog({
                    guildId: guild!.id,
                    userId: author.id,
                    userTag: author.tag,
                    moderatorId: this.container.client.user!.id,
                    guild: guild!,
                    action: 'warn', // Log as a warning
                    reason,
                    isAutomatic: true
                });
                break;
        }
    }
}
