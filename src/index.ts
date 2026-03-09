import 'dotenv/config';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-i18next/register';
import '@sapphire/plugin-subcommands/register';
import './database/Redis';
import { connectDB, prisma } from './database/db';
import { CaramelClient } from './structures/CaramelClient';
import { container } from '@sapphire/framework';
import { setupVanityWorker } from './workers/VanityWorker';
import { setupSilentBanWorker } from './workers/SilentBanWorker';
import { setupMuteWorker } from './workers/MuteWorker';


// Bootstrap ──────────────────

const client = new CaramelClient();

async function bootstrap() {
    try {
        await connectDB();

        // Attach workers to container ──────────

        container.vanityWorker    = setupVanityWorker();
        container.silentBanWorker = setupSilentBanWorker();
        container.muteWorker      = setupMuteWorker();

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
        silentBanWorker: ReturnType<typeof setupSilentBanWorker>;
        muteWorker:      ReturnType<typeof setupMuteWorker>;
    }
}

bootstrap();
