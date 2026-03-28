import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import { resolveKey } from '@sapphire/plugin-i18next';
import { getMessageLayout } from '../../../lib/layouts/defaultLayout';

const healthStatuses = {
    ok: 'ok',
    down: 'down',
    degraded: 'degraded'
} as const;

type HealthStatus = (typeof healthStatuses)[keyof typeof healthStatuses];

export class HealthCommand {
    private static readonly dbHealthcheckQuery = 'SELECT 1';

    private static formatUptime(totalSeconds: number) {
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }

    private static formatMb(bytes: number) {
        return (bytes / 1024 / 1024).toFixed(1);
    }

    public static async run(interaction: Subcommand.ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: ['Ephemeral'] });

        const uptime = this.formatUptime(process.uptime());
        const wsPing = Math.round(interaction.client.ws.ping || 0);
        const memory = process.memoryUsage();

        const dbStart = Date.now();
        const dbStatus = await container.db.$queryRawUnsafe(this.dbHealthcheckQuery)
            .then(() => healthStatuses.ok)
            .catch(() => healthStatuses.down);
        const dbLatencyMs = Date.now() - dbStart;

        const redisStart = Date.now();
        const redisStatus = await container.redis.ping()
            .then((pong: string) => (pong === 'PONG' ? healthStatuses.ok : healthStatuses.degraded))
            .catch(() => healthStatuses.down);
        const redisLatencyMs = Date.now() - redisStart;

        const music = container.music;
        const notAvailable = await resolveKey(interaction, 'admincommands:health.values.notAvailable');
        const readyAt = interaction.client.readyTimestamp
            ? `<t:${Math.floor(interaction.client.readyTimestamp / 1000)}:R>`
            : notAvailable;

        const title = await resolveKey(interaction, 'admincommands:health.title');
        const statusOk = await resolveKey(interaction, 'admincommands:health.status.ok');
        const statusDegraded = await resolveKey(interaction, 'admincommands:health.status.degraded');
        const statusDown = await resolveKey(interaction, 'admincommands:health.status.down');

        const localizedStatusMap: Record<HealthStatus, string> = {
            [healthStatuses.ok]: statusOk,
            [healthStatuses.degraded]: statusDegraded,
            [healthStatuses.down]: statusDown
        };

        const mapStatus = (status: HealthStatus) => localizedStatusMap[status];

        const lines = [
            `### ${title}`,
            '',
            `**${await resolveKey(interaction, 'admincommands:health.labels.uptime')}**: ${uptime}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.readySince')}**: ${readyAt}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.wsPing')}**: ${wsPing}ms`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.shards')}**: ${interaction.client.ws.shards.size}`,
            '',
            `**${await resolveKey(interaction, 'admincommands:health.labels.db')}**: ${mapStatus(dbStatus)} (${dbLatencyMs}ms)`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.redis')}**: ${mapStatus(redisStatus)} (${redisLatencyMs}ms)`,
            '',
            `**${await resolveKey(interaction, 'admincommands:health.labels.guilds')}**: ${interaction.client.guilds.cache.size}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.usersCached')}**: ${interaction.client.users.cache.size}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.channelsCached')}**: ${interaction.client.channels.cache.size}`,
            '',
            `**${await resolveKey(interaction, 'admincommands:health.labels.musicNodes')}**: ${music.nodes.size}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.musicPlayers')}**: ${music.players.size}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.musicQueues')}**: ${music.queues.size}`,
            '',
            `**${await resolveKey(interaction, 'admincommands:health.labels.memoryHeap')}**: ${this.formatMb(memory.heapUsed)}MB / ${this.formatMb(memory.heapTotal)}MB`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.memoryRss')}**: ${this.formatMb(memory.rss)}MB`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.nodeVersion')}**: ${process.version}`,
            `**${await resolveKey(interaction, 'admincommands:health.labels.pid')}**: ${process.pid}`
        ];

        return interaction.editReply({ ...getMessageLayout(lines.join('\n')) });
    }
}
