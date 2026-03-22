import { Shoukaku, Connectors } from 'shoukaku';
import { container } from '@sapphire/framework';
import type { CaramelClient } from '../../structures/CaramelClient';
import { MusicPlayer } from './MusicPlayer';


// Music manager ──────────────────

export class MusicManager extends Shoukaku {
    public queues: Map<string, MusicPlayer> = new Map();

    public constructor(client: CaramelClient) {
        
        // Lavalink nodes configuration ──────────

        const nodes = [
            {
                name: 'LocalNode-01',
                url: 'localhost:2333',
                auth: 'youshallnotpass',
                secure: false
            }
        ];

        super(new Connectors.DiscordJS(client), nodes, {
            moveOnDisconnect: true,
            resume: true,
            resumeTimeout: 30,
            reconnectTries: 5,
            restTimeout: 10000
        });

        this.on('ready', (name) => {
            container.logger.info(`🎵 [LAVALINK] Node "${name}" connected and ready.`);
        });

        this.on('error', (name, error) => {
            container.logger.error(`🔴 [LAVALINK] Node "${name}" encountered an error:`, error);
        });

        this.on('disconnect', (name, count) => {
            container.logger.warn(`⚠️ [LAVALINK] Node "${name}" disconnected. (Count: ${count})`);
        });

        this.on('close', (name, code, reason) => {
            container.logger.warn(`🛑 [LAVALINK] Node "${name}" closed connection. (Code: ${code}, Reason: ${reason})`);
        });
    }
}
