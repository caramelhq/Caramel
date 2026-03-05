import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, ChannelType, TextChannel, type GuildMember, type Message } from 'discord.js';
import { addSilentBan, removeSilentBan, listSilentBans } from '../../services/SilentBanService';
import { sendModDM, sendModLog, applyMute, checkThresholds, parseDuration } from '../../lib/utils/ModUtils';
import { CacheManager } from '../../database/CacheManager';
import { prisma } from '../../database/db';
import { getLockdownLayout, getSilentBanLayout } from '../../lib/utils/layouts';
import { Emojis } from '../../lib/constants/emojis';


// Constants ──────────────────

// Duration options for silentban ──────────

const DURATION_MAP: Record<string, number> = {
    '30m': 30 * 60 * 1000,
    '1h':   1 * 60 * 60 * 1000,
    '6h':   6 * 60 * 60 * 1000,
    '1d':  24 * 60 * 60 * 1000,
    '7d':   7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};


// Mod command ──────────────────

@ApplyOptions<Subcommand.Options>({
    name: 'mod',
    description: 'Moderation commands',
    preconditions: ['GuildOnly'],
    subcommands: [
        { name: 'warn',      chatInputRun: 'chatInputWarn',      messageRun: 'messageWarn'      },
        { name: 'mute',      chatInputRun: 'chatInputMute',      messageRun: 'messageMute'      },
        { name: 'ban',       chatInputRun: 'chatInputBan',       messageRun: 'messageBan'       },
        { name: 'softban',   chatInputRun: 'chatInputSoftban',   messageRun: 'messageSoftban'   },
        { name: 'kick',      chatInputRun: 'chatInputKick',      messageRun: 'messageKick'      },
        { name: 'timeout',   chatInputRun: 'chatInputTimeout',   messageRun: 'messageTimeout'   },
        { name: 'unmute',    chatInputRun: 'chatInputUnmute',    messageRun: 'messageUnmute'    },
        { name: 'silentban', chatInputRun: 'chatInputSilentban', messageRun: 'messageSilentban' },
        { name: 'slowmode',  chatInputRun: 'chatInputSlowmode',  messageRun: 'messageSlowmode'  },
        { name: 'lockdown',  chatInputRun: 'chatInputLockdown',  messageRun: 'messageLockdown'  },
        { name: 'history',   chatInputRun: 'chatInputHistory',   messageRun: 'messageHistory'   },
    ]
})
export class ModCommand extends Subcommand {
    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                // Warn
                .addSubcommand(sub => sub.setName('warn').setDescription('Warn a member')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to warn').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                )
                // Mute
                .addSubcommand(sub => sub.setName('mute').setDescription('Mute a member using the Muted role')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to mute').setRequired(true))
                    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 30m, 2h, 1d, 1d2h30m)'))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                )
                // Ban
                .addSubcommand(sub => sub.setName('ban').setDescription('Ban a member')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to ban').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                    .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
                )
                // Softban
                .addSubcommand(sub => sub.setName('softban').setDescription('Softban a member (ban + unban to delete messages)')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to softban').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                    .addIntegerOption(opt => opt.setName('delete_days').setDescription('Days of messages to delete (0-7, default 3)').setMinValue(0).setMaxValue(7))
                )
                // Kick
                .addSubcommand(sub => sub.setName('kick').setDescription('Kick a member')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to kick').setRequired(true))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                )
                // Timeout
                .addSubcommand(sub => sub.setName('timeout').setDescription('Timeout a member')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to timeout').setRequired(true))
                    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 30m, 2h, 1d, 1d2h30m)'))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason'))
                )
                // Unmute
                .addSubcommand(sub => sub.setName('unmute').setDescription('Remove timeout from a member')
                    .addUserOption(opt => opt.setName('user').setDescription('Member to unmute').setRequired(true))
                )
                // Silentban
                .addSubcommand(sub => sub.setName('silentban').setDescription('Manage silent bans')
                    .addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true)
                        .addChoices(
                            { name: 'Add',    value: 'add'    },
                            { name: 'Remove', value: 'remove' },
                            { name: 'List',   value: 'list'   }
                        ))
                    .addUserOption(opt => opt.setName('user').setDescription('Target user (not needed for list)'))
                    .addStringOption(opt => opt.setName('duration').setDescription('Duration (add only)')
                        .addChoices(
                            { name: '30 minutes', value: '30m' },
                            { name: '1 hour',     value: '1h'  },
                            { name: '6 hours',    value: '6h'  },
                            { name: '1 day',      value: '1d'  },
                            { name: '7 days',     value: '7d'  },
                            { name: '30 days',    value: '30d' }
                        ))
                    .addStringOption(opt => opt.setName('reason').setDescription('Reason (add only)'))
                )
                // Slowmode
                .addSubcommand(sub => sub.setName('slowmode').setDescription('Set slowmode in a channel')
                    .addIntegerOption(opt => opt.setName('seconds').setDescription('Slowmode in seconds (0 to disable)').setRequired(true).setMinValue(0).setMaxValue(21600))
                    .addChannelOption(opt => opt.setName('channel').setDescription('Channel (defaults to current)').addChannelTypes(ChannelType.GuildText))
                )
                // Lockdown
                .addSubcommand(sub => sub.setName('lockdown').setDescription('Toggle lockdown in a channel')
                    .addChannelOption(opt => opt.setName('channel').setDescription('Channel (defaults to current)').addChannelTypes(ChannelType.GuildText))
                )
                // History
                .addSubcommand(sub => sub.setName('history').setDescription('View sanction history of a user')
                    .addUserOption(opt => opt.setName('user').setDescription('User to check'))
                    .addStringOption(opt => opt.setName('user_id').setDescription('User ID (if not in server)'))
                )
        );
    }


    // Helpers ──────────


    // Returns the cached mod config for a guild ──────────

    private async getModConfig(guildId: string) {
        return CacheManager.getModConfig(guildId);
    }


    // Validates that the executor can moderate the target ──────────

    private async validateMod(interaction: Subcommand.ChatInputCommandInteraction, target: GuildMember) {
        const executor = await interaction.guild!.members.fetch(interaction.user.id);
        if (target.user.bot) return '`❌` You cannot moderate a bot.';
        if (target.id === interaction.user.id) return '`❌` You cannot moderate yourself.';
        if (target.id === interaction.guild!.ownerId) return '`❌` You cannot moderate the server owner.';
        if (target.roles.highest.position >= executor.roles.highest.position) return '`❌` You cannot moderate someone with an equal or higher role.';
        return null;
    }


    // Checks that the mod module is enabled and configured ──────────

    private async requireModConfig(interaction: Subcommand.ChatInputCommandInteraction) {
        const { modModule, modLogChannelId } = await this.getModConfig(interaction.guildId!);
        if (!modModule || !modLogChannelId) {
            await interaction.editReply({ content: '`❌` Moderation module is not configured or disabled. Use `/module setup name:Moderation` first.' });
            return false;
        }
        return true;
    }


    // Formats a date as a Discord relative timestamp ──────────

    private formatExpiry(date: Date | null) {
        if (!date) return '`Never`';
        return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
    }


    // Warn ──────────

    public async chatInputWarn(interaction: Subcommand.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const reason = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        const err = await this.validateMod(interaction, target);
        if (err) return interaction.editReply({ content: err });
        if (!await this.requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'warn', guildName: interaction.guild!.name, reason });
            await sendModLog({ guildId: interaction.guildId!, action: 'warn', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason });

            const warnCount = await prisma.modLog.count({ where: { guildId: interaction.guildId!, userId: target.id, action: 'warn' } });
            await checkThresholds({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild! });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been warned. Total warnings: \`${warnCount}\`` });
        } catch (error) {
            this.container.logger.error(`[MOD WARN]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageWarn(message: Message, args: any) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod warn @user [reason]`');
        const executor = message.member!;
        if (target.user.bot) return message.reply('`❌` You cannot moderate a bot.');
        if (target.id === message.author.id) return message.reply('`❌` You cannot warn yourself.');
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot moderate someone with an equal or higher role.');

        const { modLogChannelId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');

        try {
            await sendModDM({ userId: target.id, action: 'warn', guildName: message.guild!.name, reason });
            await sendModLog({ guildId: message.guildId!, action: 'warn', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason });

            const warnCount = await prisma.modLog.count({ where: { guildId: message.guildId!, userId: target.id, action: 'warn' } });
            await checkThresholds({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild! });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been warned. Total warnings: \`${warnCount}\``);
        } catch (error) {
            this.container.logger.error(`[MOD WARN]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Mute ──────────

    public async chatInputMute(interaction: Subcommand.ChatInputCommandInteraction) {
        const target        = interaction.options.getMember('user') as GuildMember | null;
        const durationInput = interaction.options.getString('duration') ?? null;
        const reason        = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        const err = await this.validateMod(interaction, target);
        if (err) return interaction.editReply({ content: err });
        if (!await this.requireModConfig(interaction)) return;

        const { mutedRoleId } = await this.getModConfig(interaction.guildId!);
        if (!mutedRoleId) return interaction.editReply({ content: '`❌` Muted role is not configured. Run `/module setup name:Moderation` again.' });

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return interaction.editReply({ content: '`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.' });
        }

        try {
            await target.roles.add(mutedRoleId, reason ?? undefined);
            await prisma.activeMute.upsert({
                where:  { mute_guild_user_unique: { guildId: interaction.guildId!, userId: target.id } },
                create: { guildId: interaction.guildId!, userId: target.id, moderatorId: interaction.user.id, reason, expiresAt: parsed?.expiresAt ?? null },
                update: { moderatorId: interaction.user.id, reason, expiresAt: parsed?.expiresAt ?? null },
            });
            await sendModDM({ userId: target.id, action: 'timeout', guildName: interaction.guild!.name, reason, duration: parsed?.formatted ?? 'Permanent' });
            await sendModLog({ guildId: interaction.guildId!, action: 'timeout', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been muted${parsed ? ` for **${parsed.formatted}**` : ' permanently'}.` });
        } catch (error) {
            this.container.logger.error(`[MOD MUTE]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageMute(message: Message, args: any) {
        const target        = await args.pick('member').catch(() => null) as GuildMember | null;
        const durationInput = await args.pick('string').catch(() => null);
        const reason        = await args.rest('string').catch(() => null);

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod mute @user [duration] [reason]`');
        const executor = message.member!;
        if (target.user.bot) return message.reply('`❌` You cannot moderate a bot.');
        if (target.id === message.author.id) return message.reply('`❌` You cannot mute yourself.');
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot moderate someone with an equal or higher role.');

        const { modLogChannelId, mutedRoleId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');
        if (!mutedRoleId) return message.reply('`❌` Muted role is not configured. Run `/module setup name:Moderation` again.');

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return message.reply('`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.');
        }

        try {
            await target.roles.add(mutedRoleId, reason ?? undefined);
            await prisma.activeMute.upsert({
                where:  { mute_guild_user_unique: { guildId: message.guildId!, userId: target.id } },
                create: { guildId: message.guildId!, userId: target.id, moderatorId: message.author.id, reason, expiresAt: parsed?.expiresAt ?? null },
                update: { moderatorId: message.author.id, reason, expiresAt: parsed?.expiresAt ?? null },
            });
            await sendModDM({ userId: target.id, action: 'timeout', guildName: message.guild!.name, reason, duration: parsed?.formatted ?? 'Permanent' });
            await sendModLog({ guildId: message.guildId!, action: 'timeout', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been muted${parsed ? ` for **${parsed.formatted}**` : ' permanently'}.`);
        } catch (error) {
            this.container.logger.error(`[MOD MUTE]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Ban ──────────

    public async chatInputBan(interaction: Subcommand.ChatInputCommandInteraction) {
        const target     = interaction.options.getMember('user') as GuildMember | null;
        const reason     = interaction.options.getString('reason') ?? null;
        const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        const err = await this.validateMod(interaction, target);
        if (err) return interaction.editReply({ content: err });
        if (!target.bannable) return interaction.editReply({ content: '`❌` I cannot ban this member. Check my role position.' });
        if (!await this.requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'ban', guildName: interaction.guild!.name, reason });
            await target.ban({ reason: reason ?? undefined, deleteMessageDays: deleteDays });
            await sendModLog({ guildId: interaction.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been banned.` });
        } catch (error) {
            this.container.logger.error(`[MOD BAN]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageBan(message: Message, args: any) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod ban @user [reason]`');
        const executor = message.member!;
        if (target.user.bot) return message.reply('`❌` You cannot moderate a bot.');
        if (target.id === message.author.id) return message.reply('`❌` You cannot ban yourself.');
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot moderate someone with an equal or higher role.');
        if (!target.bannable) return message.reply('`❌` I cannot ban this member.');

        const { modLogChannelId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');

        try {
            await sendModDM({ userId: target.id, action: 'ban', guildName: message.guild!.name, reason });
            await target.ban({ reason: reason ?? undefined });
            await sendModLog({ guildId: message.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been banned.`);
        } catch (error) {
            this.container.logger.error(`[MOD BAN]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Softban ──────────

    public async chatInputSoftban(interaction: Subcommand.ChatInputCommandInteraction) {
        const target     = interaction.options.getMember('user') as GuildMember | null;
        const reason     = interaction.options.getString('reason') ?? null;
        const deleteDays = interaction.options.getInteger('delete_days') ?? 3;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        const err = await this.validateMod(interaction, target);
        if (err) return interaction.editReply({ content: err });
        if (!target.bannable) return interaction.editReply({ content: '`❌` I cannot ban this member. Check my role position.' });
        if (!await this.requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'ban', guildName: interaction.guild!.name, reason });
            await target.ban({ reason: reason ?? undefined, deleteMessageDays: deleteDays });
            await interaction.guild!.members.unban(target.id, 'Softban - automatic unban');
            await sendModLog({ guildId: interaction.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason: `[Softban] ${reason ?? ''}`.trim() });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been softbanned. Messages from the last **${deleteDays} days** were deleted.` });
        } catch (error) {
            this.container.logger.error(`[MOD SOFTBAN]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageSoftban(message: Message, args: any) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod softban @user [reason]`');
        const executor = message.member!;
        if (target.user.bot) return message.reply('`❌` You cannot moderate a bot.');
        if (target.id === message.author.id) return message.reply('`❌` You cannot softban yourself.');
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot moderate someone with an equal or higher role.');
        if (!target.bannable) return message.reply('`❌` I cannot ban this member.');

        const { modLogChannelId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');

        try {
            await sendModDM({ userId: target.id, action: 'ban', guildName: message.guild!.name, reason });
            await target.ban({ reason: reason ?? undefined, deleteMessageDays: 3 });
            await message.guild!.members.unban(target.id, 'Softban - automatic unban');
            await sendModLog({ guildId: message.guildId!, action: 'ban', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason: `[Softban] ${reason ?? ''}`.trim() });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been softbanned.`);
        } catch (error) {
            this.container.logger.error(`[MOD SOFTBAN]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Kick ──────────

    public async chatInputKick(interaction: Subcommand.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        const reason = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        const err = await this.validateMod(interaction, target);
        if (err) return interaction.editReply({ content: err });
        if (!target.kickable) return interaction.editReply({ content: '`❌` I cannot kick this member. Check my role position.' });
        if (!await this.requireModConfig(interaction)) return;

        try {
            await sendModDM({ userId: target.id, action: 'kick', guildName: interaction.guild!.name, reason });
            await target.kick(reason ?? undefined);
            await sendModLog({ guildId: interaction.guildId!, action: 'kick', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been kicked.` });
        } catch (error) {
            this.container.logger.error(`[MOD KICK]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageKick(message: Message, args: any) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;
        const reason = await args.rest('string').catch(() => null);

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod kick @user [reason]`');
        const executor = message.member!;
        if (target.user.bot) return message.reply('`❌` You cannot moderate a bot.');
        if (target.id === message.author.id) return message.reply('`❌` You cannot kick yourself.');
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot moderate someone with an equal or higher role.');
        if (!target.kickable) return message.reply('`❌` I cannot kick this member.');

        const { modLogChannelId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');

        try {
            await sendModDM({ userId: target.id, action: 'kick', guildName: message.guild!.name, reason });
            await target.kick(reason ?? undefined);
            await sendModLog({ guildId: message.guildId!, action: 'kick', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been kicked.`);
        } catch (error) {
            this.container.logger.error(`[MOD KICK]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Timeout ──────────

    public async chatInputTimeout(interaction: Subcommand.ChatInputCommandInteraction) {
        const target        = interaction.options.getMember('user') as GuildMember | null;
        const durationInput = interaction.options.getString('duration') ?? null;
        const reason        = interaction.options.getString('reason') ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        const err = await this.validateMod(interaction, target);
        if (err) return interaction.editReply({ content: err });
        if (!target.moderatable) return interaction.editReply({ content: '`❌` I cannot timeout this member. Check my role position.' });
        if (!await this.requireModConfig(interaction)) return;

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return interaction.editReply({ content: '`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.' });
        }

        try {
            await applyMute({ guildId: interaction.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, guild: interaction.guild!, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been timed out${parsed ? ` for **${parsed.formatted}**` : ' permanently'}.` });
        } catch (error) {
            this.container.logger.error(`[MOD TIMEOUT]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageTimeout(message: Message, args: any) {
        const target        = await args.pick('member').catch(() => null) as GuildMember | null;
        const durationInput = await args.pick('string').catch(() => null);
        const reason        = await args.rest('string').catch(() => null);

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod timeout @user [duration] [reason]`');
        const executor = message.member!;
        if (target.user.bot) return message.reply('`❌` You cannot moderate a bot.');
        if (target.id === message.author.id) return message.reply('`❌` You cannot timeout yourself.');
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot moderate someone with an equal or higher role.');

        let parsed = null;
        if (durationInput) {
            parsed = parseDuration(durationInput);
            if (!parsed) return message.reply('`❌` Invalid duration. Use: `1d`, `2h`, `30m`, or combined like `1d2h30m`.');
        }

        const { modLogChannelId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');

        try {
            await applyMute({ guildId: message.guildId!, userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, guild: message.guild!, reason, duration: parsed?.formatted ?? 'Permanent', expiresAt: parsed?.expiresAt ?? null });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been timed out${parsed ? ` for **${parsed.formatted}**` : ' permanently'}.`);
        } catch (error) {
            this.container.logger.error(`[MOD TIMEOUT]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Unmute ──────────

    public async chatInputUnmute(interaction: Subcommand.ChatInputCommandInteraction) {
        const target = interaction.options.getMember('user') as GuildMember | null;
        await interaction.deferReply({ ephemeral: false });

        if (!target) return interaction.editReply({ content: '`❌` Member not found.' });
        if (!target.isCommunicationDisabled()) return interaction.editReply({ content: '`❌` This member is not timed out.' });
        if (!await this.requireModConfig(interaction)) return;

        const executor = await interaction.guild!.members.fetch(interaction.user.id);
        if (target.roles.highest.position >= executor.roles.highest.position) return interaction.editReply({ content: '`❌` You cannot unmute someone with an equal or higher role.' });

        try {
            await target.timeout(null);
            await prisma.activeMute.deleteMany({ where: { guildId: interaction.guildId!, userId: target.id } });
            await sendModLog({ guildId: interaction.guildId!, action: 'unmute', userId: target.id, userTag: target.user.tag, moderatorId: interaction.user.id, reason: null });

            return interaction.editReply({ content: `${Emojis.enabled_setting_emoji} **${target.user.tag}** has been unmuted.` });
        } catch (error) {
            this.container.logger.error(`[MOD UNMUTE]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageUnmute(message: Message, args: any) {
        const target = await args.pick('member').catch(() => null) as GuildMember | null;

        if (!target) return message.reply('`❌` Member not found. Usage: `p!mod unmute @user`');
        if (!target.isCommunicationDisabled()) return message.reply('`❌` This member is not timed out.');

        const executor = message.member!;
        if (target.roles.highest.position >= executor.roles.highest.position) return message.reply('`❌` You cannot unmute someone with an equal or higher role.');

        const { modLogChannelId } = await this.getModConfig(message.guildId!);
        if (!modLogChannelId) return message.reply('`❌` Moderation module is not configured.');

        try {
            await target.timeout(null);
            await prisma.activeMute.deleteMany({ where: { guildId: message.guildId!, userId: target.id } });
            await sendModLog({ guildId: message.guildId!, action: 'unmute', userId: target.id, userTag: target.user.tag, moderatorId: message.author.id, reason: null });

            return message.reply(`${Emojis.enabled_setting_emoji} **${target.user.tag}** has been unmuted.`);
        } catch (error) {
            this.container.logger.error(`[MOD UNMUTE]`, error);
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Silentban ──────────

    public async chatInputSilentban(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });

        const action   = interaction.options.getString('action', true) as 'add' | 'remove' | 'list';
        const target   = interaction.options.getUser('user');
        const duration = interaction.options.getString('duration');
        const reason   = interaction.options.getString('reason')?.slice(0, 500) ?? null;

        if (action !== 'list' && !target) return interaction.editReply({ content: '`❌` You must specify a user.' });

        if (action === 'add') {
            if (target!.id === interaction.user.id) return interaction.editReply("`❌` You can't silent ban yourself.");
            if (target!.bot) return interaction.editReply("`❌` You can't silent ban bots.");
            const durationMs = duration ? DURATION_MAP[duration] : null;

            try {
                await addSilentBan(interaction.guildId!, target!.id, interaction.user.id, reason, durationMs);
                return interaction.editReply(getSilentBanLayout('add', { userTag: target!.username, duration: duration ?? 'Permanent', reason }));
            } catch (error) {
                this.container.logger.error(error);
                return interaction.editReply('`❌` Error applying the silent ban.');
            }
        }

        if (action === 'remove') {
            try {
                await removeSilentBan(interaction.guildId!, target!.id);
                return interaction.editReply(getSilentBanLayout('remove', { userTag: target!.username }));
            } catch (error) {
                this.container.logger.error(error);
                return interaction.editReply('`❌` Error removing the silent ban.');
            }
        }

        if (action === 'list') {
            try {
                const bans = await listSilentBans(interaction.guildId!);
                if (bans.length === 0) return interaction.editReply('`📋` No active silent bans.');
                const listText = bans.map(ban => `${Emojis.bullet_emoji} <@${ban.userId}> › expires ${this.formatExpiry(ban.expiresAt)}`).join('\n');
                return interaction.editReply(getSilentBanLayout('list', { count: bans.length, listText }));
            } catch (error) {
                this.container.logger.error(error);
                return interaction.editReply('`❌` Error listing silent bans.');
            }
        }
    }

    public async messageSilentban(message: Message, args: any) {
        const action = await args.pick('string').catch(() => null) as 'add' | 'remove' | 'list' | null;
        if (!action || !['add', 'remove', 'list'].includes(action)) {
            return message.reply('`❌` Usage: `p!mod silentban <add|remove|list> [@user] [duration] [reason]`');
        }

        if (action === 'list') {
            try {
                const bans = await listSilentBans(message.guildId!);
                if (bans.length === 0) return message.reply('`📋` No active silent bans.');
                const listText = bans.map(ban => `${Emojis.bullet_emoji} <@${ban.userId}> › expires ${this.formatExpiry(ban.expiresAt)}`).join('\n');
                return message.reply(getSilentBanLayout('list', { count: bans.length, listText }) as any);
            } catch (error) {
                return message.reply('`❌` Error listing silent bans.');
            }
        }

        const target = await args.pick('user').catch(() => null);
        if (!target) return message.reply('`❌` You must specify a user.');

        if (action === 'add') {
            const maybeDuration = await args.pick('string').catch(() => null);
            const durationKey   = maybeDuration && DURATION_MAP[maybeDuration] ? maybeDuration : null;
            const durationMs    = durationKey ? DURATION_MAP[durationKey] : null;
            const reason        = durationKey
                ? await args.rest('string').catch(() => null)
                : maybeDuration;

            try {
                await addSilentBan(message.guildId!, target.id, message.author.id, reason, durationMs);
                return message.reply(getSilentBanLayout('add', { userTag: target.username, duration: durationKey ?? 'Permanent', reason }) as any);
            } catch (error) {
                return message.reply('`❌` Error applying the silent ban.');
            }
        }

        if (action === 'remove') {
            try {
                await removeSilentBan(message.guildId!, target.id);
                return message.reply(getSilentBanLayout('remove', { userTag: target.username }) as any);
            } catch (error) {
                return message.reply('`❌` Error removing the silent ban.');
            }
        }
    }


    // Slowmode ──────────

    public async chatInputSlowmode(interaction: Subcommand.ChatInputCommandInteraction) {
        const seconds = interaction.options.getInteger('seconds', true);
        const target  = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
        await interaction.deferReply({ ephemeral: false });

        try {
            await target.setRateLimitPerUser(seconds);
            const msg = seconds === 0
                ? `${Emojis.timeout_emoji} Slowmode disabled in <#${target.id}>.`
                : `${Emojis.timeout_emoji} Slowmode set to **${seconds}s** in <#${target.id}>.`;
            return interaction.editReply({ content: msg });
        } catch (error) {
            this.container.logger.error(`[MOD SLOWMODE]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageSlowmode(message: Message, args: any) {
        const seconds = await args.pick('integer').catch(() => null);
        if (seconds === null || seconds < 0 || seconds > 21600) return message.reply('`❌` Usage: `p!mod slowmode <seconds> [#channel]`');

        const target = await args.pick('channel').catch(() => message.channel) as TextChannel;

        try {
            await target.setRateLimitPerUser(seconds);
            const msg = seconds === 0
                ? `${Emojis.timeout_emoji} Slowmode disabled in <#${target.id}>.`
                : `${Emojis.timeout_emoji} Slowmode set to **${seconds}s** in <#${target.id}>.`;
            return message.reply(msg);
        } catch (error) {
            return message.reply('`🔴` An error occurred.');
        }
    }


    // Lockdown ──────────

    public async chatInputLockdown(interaction: Subcommand.ChatInputCommandInteraction) {
        const target = (interaction.options.getChannel('channel') ?? interaction.channel) as TextChannel;
        await interaction.deferReply({ ephemeral: false });

        try {
            const everyoneOverwrite = target.permissionOverwrites.cache.get(interaction.guild!.roles.everyone.id);
            const isLocked = everyoneOverwrite?.deny.has('SendMessages') ?? false;

            if (isLocked) {
                await target.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: null });
                await target.send({ ...getLockdownLayout(false) });
                return interaction.editReply({ content: `${Emojis.channel_unlocked_emoji} <#${target.id}> has been unlocked.` });
            } else {
                await target.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false });
                await target.send({ ...getLockdownLayout(true) });
                return interaction.editReply({ content: `${Emojis.channel_locked_emoji} <#${target.id}> has been locked.` });
            }
        } catch (error) {
            this.container.logger.error(`[MOD LOCKDOWN]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageLockdown(message: Message, args: any) {
        const target = await args.pick('channel').catch(() => message.channel) as TextChannel;

        try {
            const everyoneOverwrite = target.permissionOverwrites.cache.get(message.guild!.roles.everyone.id);
            const isLocked = everyoneOverwrite?.deny.has('SendMessages') ?? false;

            if (isLocked) {
                await target.permissionOverwrites.edit(message.guild!.roles.everyone, { SendMessages: null });
                await target.send({ ...getLockdownLayout(false) });
                return message.reply(`${Emojis.channel_unlocked_emoji} <#${target.id}> has been unlocked.`);
            } else {
                await target.permissionOverwrites.edit(message.guild!.roles.everyone, { SendMessages: false });
                await target.send({ ...getLockdownLayout(true) });
                return message.reply(`${Emojis.channel_locked_emoji} <#${target.id}> has been locked.`);
            }
        } catch (error) {
            return message.reply('`🔴` An error occurred.');
        }
    }


    // History ──────────

    public async chatInputHistory(interaction: Subcommand.ChatInputCommandInteraction) {
        const userOption   = interaction.options.getUser('user');
        const userIdOption = interaction.options.getString('user_id');
        const targetId     = userOption?.id ?? userIdOption ?? null;
        await interaction.deferReply({ ephemeral: false });

        if (!targetId) return interaction.editReply({ content: '`❌` Please specify a user or user ID.' });

        try {
            const logs = await prisma.modLog.findMany({
                where:   { guildId: interaction.guildId!, userId: targetId },
                orderBy: { createdAt: 'desc' },
                take:    10,
            });

            if (logs.length === 0) return interaction.editReply({ content: '`📋` No sanctions found for this user.' });

            const lines = logs.map(log => {
                const time     = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
                const duration = log.duration ? ` · ${log.duration}` : '';
                const reason   = log.reason   ? ` · ${log.reason}`   : '';
                return `${Emojis.bullet_emoji} \`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
            }).join('\n');

            return interaction.editReply({ content: `${Emojis.static_setting_emoji} **Sanction history for <@${targetId}>**\n\n${lines}` });
        } catch (error) {
            this.container.logger.error(`[MOD HISTORY]`, error);
            return interaction.editReply({ content: '`🔴` An error occurred.' });
        }
    }

    public async messageHistory(message: Message, args: any) {
        const target   = await args.pick('user').catch(() => null);
        const targetId = target?.id ?? await args.pick('string').catch(() => null);

        if (!targetId) return message.reply('`❌` Usage: `p!mod history @user` or `p!mod history <user_id>`');

        try {
            const logs = await prisma.modLog.findMany({
                where:   { guildId: message.guildId!, userId: targetId },
                orderBy: { createdAt: 'desc' },
                take:    10,
            });

            if (logs.length === 0) return message.reply('`📋` No sanctions found for this user.');

            const lines = logs.map(log => {
                const time     = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
                const duration = log.duration ? ` · ${log.duration}` : '';
                const reason   = log.reason   ? ` · ${log.reason}`   : '';
                return `${Emojis.bullet_emoji} \`${log.action.toUpperCase()}\` ${time}${duration}${reason}`;
            }).join('\n');

            return message.reply(`${Emojis.static_setting_emoji} **Sanction history for <@${targetId}>**\n\n${lines}`);
        } catch (error) {
            return message.reply('`🔴` An error occurred.');
        }
    }
}