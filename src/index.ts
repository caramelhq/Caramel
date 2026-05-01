import 'dotenv/config';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-i18next/register';
import '@sapphire/plugin-subcommands/register';
import './database/Redis';
import { connectDB, prisma } from './database/db';
import { CaramelClient } from './structures/CaramelClient';
import { container } from '@sapphire/framework';
import { setupVanityWorker } from './workers/VanityWorker';
import { setupClanTagWorker } from './workers/ClanTagWorker';
import { setupSilentBanWorker } from './workers/SilentBanWorker';
import { setupMuteWorker } from './workers/MuteWorker';
import { setupTempBanWorker } from './workers/TempBanWorker';
import { setupTicketWorker } from './workers/TicketWorker';
import { MusicManager } from './lib/structures/MusicManager';
import { startStatsServer } from './api/StatsServer';


// Bootstrap ──────────────────

const client = new CaramelClient();

async function bootstrap() {
    try {
        await connectDB();
        startStatsServer(Number(process.env.API_PORT) || 4000);

        // Attach workers to container ──────────

        container.vanityWorker    = setupVanityWorker();
        container.clanTagWorker   = setupClanTagWorker();
        container.silentBanWorker = setupSilentBanWorker();
        container.muteWorker      = setupMuteWorker();
        container.tempBanWorker   = setupTempBanWorker();
        container.ticketWorker    = setupTicketWorker();

        await client.start(process.env.DISCORD_TOKEN!);
    } catch (error) {
        if (container.logger) {
            container.logger.error('[BOOTSTRAP] Fatal error during startup: ' + (error as Error).message);
        } else {
            console.error('[BOOTSTRAP] Fatal error before logger init:', error);
        }
        process.exit(1);
    }
}


// Graceful shutdown ──────────

process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });


// Container type augmentation ──────────

declare module '@sapphire/pieces' {
    interface Container {
        vanityWorker:    ReturnType<typeof setupVanityWorker>;
        clanTagWorker:   ReturnType<typeof setupClanTagWorker>;
        silentBanWorker: ReturnType<typeof setupSilentBanWorker>;
        muteWorker:      ReturnType<typeof setupMuteWorker>;
        tempBanWorker:   ReturnType<typeof setupTempBanWorker>;
        ticketWorker:    ReturnType<typeof setupTicketWorker>;
        music:           MusicManager;
    }
}

bootstrap();
