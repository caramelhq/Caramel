import { Worker, type Job } from 'bullmq';
import { container } from '@sapphire/framework';
import { checkClanTag } from '../lib/utils/clanTag';
import { Redis } from 'ioredis';


// Clan tag worker ──────────────────

export function setupClanTagWorker() {
    const { logger } = container;

    logger.info('[WORKER] Initialized successfully - Clan Tag Tracker');

    const workerConnection = new Redis({
        ...container.redis?.options,
        maxRetriesPerRequest: null
    });

    // Job handler ──────────

    const worker = new Worker(
        'clantag-roles',
        async (job: Job) => {
            try {
                const guild = await container.client.guilds.fetch(job.data.guildId).catch(() => null);
                if (!guild) return;

                const member = await guild.members.fetch(job.data.memberId).catch(() => null);
                if (!member) return;

                await checkClanTag(member, job.data.hasTag, job.data.tagString ?? '');
            } catch (error) {
                logger.error(`[CLANTAG-WORKER] Critical failure in job ${job.id}:`, error);
                throw error;
            }
        },
        {
            connection: workerConnection as any,
            prefix: 'caramel-clantag',
            concurrency: 1,
            lockDuration: 60000,
            lockRenewTime: 30000,
            stalledInterval: 60000,
            maxStalledCount: 0,
            removeOnComplete: { count: 0 },
            removeOnFail: { count: 100 }
        }
    );

    // Events ──────────

    worker.on('failed', (job, err) => {
        logger.error(`[CLANTAG-WORKER] Job ${job?.id} failed: ${err.message}`);
    });

    worker.on('closed', async () => {
        await workerConnection.quit();
        logger.info('[CLANTAG-WORKER] Redis connection closed');
    });

    return worker;
}
