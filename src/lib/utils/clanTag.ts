import { GuildMember, TextChannel, WebhookClient } from 'discord.js';
import { container } from '@sapphire/framework';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { getClanTagWelcomeLayout } from '../layouts/clanTagLayouts';


// Clan tag utils ──────────────────

const webhookCache = new Map<string, WebhookClient>();

async function getClanTagWebhook(channel: TextChannel): Promise<WebhookClient | null> {
    if (webhookCache.has(channel.id)) return webhookCache.get(channel.id)!;

    try {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh =>
            wh.name === 'Caramel' &&
            wh.owner?.id === channel.client.user?.id
        );
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'Caramel',
                avatar: channel.client.user?.displayAvatarURL(),
                reason: 'Caramel clan tag log'
            });
        }
        const client = new WebhookClient({ url: `${webhook.url}?with_components=true` });
        webhookCache.set(channel.id, client);

        return client;
    } catch {
        return null;
    }
}


let _clanTagQueue: Queue | null = null;


// Returns (or creates) the clan tag role queue ──────────

function getQueue() {
    if (!_clanTagQueue) {
        const queueConnection = new Redis({
            ...container.redis?.options,
            maxRetriesPerRequest: null,
        });

        _clanTagQueue = new Queue('clantag-roles', {
            connection: queueConnection as any,
            prefix: 'caramel-clantag'
        });
    }
    return _clanTagQueue;
}


// Adds a clan tag role check job to the queue ──────────

export async function addClanTagJob(member: GuildMember, hasTag: boolean, tagString = '') {
    try {
        const queue = getQueue();
        await queue.add(
            'check-role',
            {
                memberId: member.id,
                guildId: member.guild.id,
                hasTag,
                tagString
            },
            {
                attempts: 3,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: true,
                removeOnFail: { count: 10 },
                delay: 1000
            }
        );
    } catch (error) {
        container.logger.error(`[CLANTAG-QUEUE-FATAL] Could not add job: ${error}`);
    }
}


// Checks if a member should have the clan tag role and adds/removes it accordingly ──────────
// tagString is the member's actual displayed clan tag (e.g. "CARM"), captured at enqueue time
// from primaryGuild.tag. It is only used for the welcome layout — never for matching.

export async function checkClanTag(member: GuildMember, hasTag: boolean, tagString = '') {
    const { guild } = member;
    if (!guild || member.user.bot) return;

    const { redis, logger } = container;

    try {
        const [clanTagModule, clanTagRoleId, logChannelId] = await redis.mget(
            `clantag:module:${guild.id}`,
            `clantag:role:${guild.id}`,
            `clantag:channel:${guild.id}`
        );

        if (!clanTagModule || (clanTagModule !== 'true' && clanTagModule !== '1') || !clanTagRoleId) return;

        const hasRole = member.roles.cache.has(clanTagRoleId);

        const role = guild.roles.cache.get(clanTagRoleId) || await guild.roles.fetch(clanTagRoleId).catch(() => null);
        if (!role) {
            logger.warn(`[CLANTAG] Role ${clanTagRoleId} not found in ${guild.name}`);
            return;
        }

        if (hasTag && !hasRole) {
            await member.roles.add(role);
            // Persist last known state so the listener can skip duplicate jobs.
            await redis.set(`clantag:member:${guild.id}:${member.id}`, 'true', 'EX', 86400);
            logger.info(`[CLANTAG] Role added to ${member.user.tag}`);

            if (logChannelId) {
                const channel = (guild.channels.cache.get(logChannelId) ?? await guild.channels.fetch(logChannelId).catch(() => null)) as TextChannel | null;

                if (channel) {
                    const avatar = member.user.displayAvatarURL({ extension: 'png', size: 512 });
                    const welcomeLayout = getClanTagWelcomeLayout(member.id, clanTagRoleId, avatar, tagString);

                    try {
                        const webhookClient = await getClanTagWebhook(channel);
                        if (webhookClient) await webhookClient.send(welcomeLayout as any);
                        logger.info(`[CLANTAG] Welcome message sent successfully`);
                    } catch (err) {
                        logger.error(`[CLANTAG-LOG-ERROR] ${err}`);
                    }
                }
            } else {
                logger.warn(`[CLANTAG] No logChannelId configured for guild ${guild.id}`);
            }

        } else if (!hasTag && hasRole) {
            await member.roles.remove(role);
            // Persist last known state so the listener can skip duplicate jobs.
            await redis.set(`clantag:member:${guild.id}:${member.id}`, 'false', 'EX', 86400);
            logger.info(`[CLANTAG] Role removed from ${member.user.tag}`);
        }

    } catch (error: any) {
        if (error.code === 50013) {
            logger.error(`[CLANTAG] Permission Error: Bot cannot manage roles in ${guild.name}. Check hierarchy.`);
        } else {
            logger.error(`[CLANTAG] Unexpected error in checkClanTag:`, error);
        }
    }
}
