import { Command, Args } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, GuildMember, Message, TextChannel } from 'discord.js';
import { resolveKey } from '@sapphire/plugin-i18next';
import { requireModConfig, parseSlowmode, formatSeconds } from '../../lib/utils/ModUtils';
import { Emojis } from '../../lib/constants/emojis';
import { ContainerComponent, TextDisplayComponent } from '../../lib/layouts/ui';
import { CaramelUserError } from '../../lib/structures/Errors';

@ApplyOptions<Command.Options>({
    name: 'slowmode',
    description: 'Set channel slowmode',
})
export class SlowmodeCommand extends Command {
    public readonly usage = 'modcommands:mod.usage.slowmode';

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
                .addStringOption(opt => opt.setName('duration').setDescription('Slowmode duration (e.g. 5s, 1m, 0/off)').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to set slowmode (optional)'))
        );
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const durationInput = interaction.options.getString('duration', true);
        const targetChannel = interaction.options.getChannel('channel') ?? interaction.channel;
        
        await interaction.deferReply({ ephemeral: false });

        if (!interaction.guild) throw new CaramelUserError('errors:unexpected');
        await requireModConfig(interaction.guildId!);

        if (!targetChannel || !('setRateLimitPerUser' in targetChannel)) throw new CaramelUserError('errors:unexpected');
        const channel = targetChannel as TextChannel;

        let seconds = parseSlowmode(durationInput);
        if (seconds === null) throw new CaramelUserError('errors:mod_invalidDuration');
        
        let capped = false;
        if (seconds > 21600) {
            seconds = 21600; // Cap at 6h
            capped = true;
        }

        await channel.setRateLimitPerUser(seconds);

        const isRemote = channel.id !== interaction.channelId;
        let successMsg = '';
        let remoteMsg = '';

        if (seconds === 0) {
            if (isRemote) {
                successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode_disabled_remote', { channel: channel.toString() });
                remoteMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode_disabled');
            } else {
                successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode_disabled');
            }
        } else {
            const timeStr = formatSeconds(seconds);
            if (isRemote) {
                successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode_remote', { time: timeStr, channel: channel.toString() });
                remoteMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode', { time: timeStr });
            } else {
                successMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode', { time: timeStr });
            }
        }
        
        await interaction.editReply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${Emojis.slowmode_emoji} ${successMsg}`)])] });

        if (isRemote && remoteMsg && 'send' in channel) {
            await (channel as any).send({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${Emojis.slowmode_emoji} ${remoteMsg}`)])] }).catch(() => null);
        }

        if (capped) {
            const warningMsg = await resolveKey(interaction, 'modcommands:sanctions.confirmations.slowmode_cap');
            await interaction.followUp({ ephemeral: true, flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${Emojis.warning_emoji} ${warningMsg}`)])] });
        }
        return;
    }

    public async messageRun(message: Message, args: Args) {
        const durationInput = await args.pick('string').catch(() => { throw new CaramelUserError('errors:mod_invalidDuration'); });
        const targetChannel = await args.pick('guildTextChannel').catch(() => message.channel as TextChannel);

        if (!message.guild) throw new CaramelUserError('errors:unexpected');
        await requireModConfig(message.guildId!);

        const channel = targetChannel;
        let seconds = parseSlowmode(durationInput);
        if (seconds === null) throw new CaramelUserError('errors:mod_invalidDuration');
        
        let capped = false;
        if (seconds > 21600) {
            seconds = 21600;
            capped = true;
        }

        if ('setRateLimitPerUser' in channel) {
            await (channel as any).setRateLimitPerUser(seconds);
        } else {
            throw new CaramelUserError('errors:unexpected');
        }

        const isRemote = channel.id !== message.channelId;
        let successMsg = '';
        let remoteMsg = '';

        if (seconds === 0) {
            if (isRemote) {
                successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode_disabled_remote', { channel: channel.toString() });
                remoteMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode_disabled');
            } else {
                successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode_disabled');
            }
        } else {
            const timeStr = formatSeconds(seconds);
            if (isRemote) {
                successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode_remote', { time: timeStr, channel: channel.toString() });
                remoteMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode', { time: timeStr });
            } else {
                successMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode', { time: timeStr });
            }
        }
        
        await message.reply({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${Emojis.slowmode_emoji} ${successMsg}`)])] });

        if (isRemote && remoteMsg && 'send' in channel) {
            await (channel as any).send({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${Emojis.slowmode_emoji} ${remoteMsg}`)])] }).catch(() => null);
        }

        if (capped && 'send' in message.channel) {
            const warningMsg = await resolveKey(message, 'modcommands:sanctions.confirmations.slowmode_cap');
            await (message.channel as any).send({ flags: 32768, components: [ContainerComponent([TextDisplayComponent(`${Emojis.warning_emoji} ${warningMsg}`)])] });
        }
        return;
    }
}
