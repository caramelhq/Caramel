import { createServer } from 'node:http';
import { container } from '@sapphire/framework';

export function startStatsServer(port: number): void {
    const token = process.env.STATS_API_TOKEN;

    const server = createServer((req, res) => {
        if (req.method !== 'GET' || req.url !== '/stats') {
            res.writeHead(404).end();
            return;
        }

        if (token && req.headers.authorization !== `Bearer ${token}`) {
            res.writeHead(401).end();
            return;
        }

        const client = container.client;
        const servers  = client.guilds.cache.size;
        const users    = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount ?? 0), 0);
        const commands = container.stores.get('commands').size;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ servers, users, commands }));
    });

    server.listen(port, () => {
        container.logger.info(`[StatsServer] Listening on port ${port}`);
    });
}
