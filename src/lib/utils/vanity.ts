import { GuildMember, TextChannel, WebhookClient } from 'discord.js';
import { container } from '@sapphire/framework';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { getVanityWelcomeLayout } from '../layouts/vanityLayouts';


// Vanity utils ──────────────────

const webhookCache = new Map<string, WebhookClient>();

async function getVanityWebhook(channel: TextChannel): Promise<WebhookClient | null> {
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
                reason: 'Caramel vanity log'
            });
        }
        const client = new WebhookClient({ url: `${webhook.url}?with_components=true` });
            webhookCache.set(channel.id, client);
        
        return client;
    } catch {
        return null;
    }
}


let _vanityQueue: Queue | null = null;


// Returns (or creates) the vanity role queue ──────────

function getQueue() {
    if (!_vanityQueue) {
        const queueConnection = new Redis({
            ...container.redis?.options,
            maxRetriesPerRequest: null,
        });

        _vanityQueue = new Queue('vanity-roles', {
            connection: queueConnection as any,
            prefix: 'caramel-vanity'
        });
    }
    return _vanityQueue;
}


// Adds a vanity role check job to the queue ──────────

export async function addVanityJob(member: GuildMember, hasVanity: boolean) {
    try {
        const queue = getQueue();
        await queue.add(
            'check-role',
            {
                memberId: member.id,
                guildId: member.guild.id,
                hasVanity
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
        container.logger.error(`[QUEUE-FATAL] Could not add job: ${error}`);
    }
}


// Checks if a member should have the vanity role and adds/removes it accordingly ──────────

export async function checkVanity(member: GuildMember, hasVanity: boolean) {
    const { guild } = member;
    if (!guild || member.user.bot) return;

    const { redis, logger } = container;

    try {
        const [vanityModule, vanityString, vanityRoleId, logChannelId] = await redis.mget(
            `vanity:module:${guild.id}`,
            `vanity:string:${guild.id}`,
            `vanity:role:${guild.id}`,
            `vanity:channel:${guild.id}`
        );

        if (!vanityModule || (vanityModule !== 'true' && vanityModule !== '1') || !vanityString || !vanityRoleId) return;

        const hasRole = member.roles.cache.has(vanityRoleId);

        const role = guild.roles.cache.get(vanityRoleId) || await guild.roles.fetch(vanityRoleId).catch(() => null);
        if (!role) {
            logger.warn(`[VANITY] Role ${vanityRoleId} not found in ${guild.name}`);
            return;
        }

        if (hasVanity && !hasRole) {
            await member.roles.add(role);
            logger.info(`➕ [VANITY] Role added to ${member.user.tag}`);

            if (logChannelId) {
                const channel = (guild.channels.cache.get(logChannelId) ?? await guild.channels.fetch(logChannelId).catch(() => null)) as TextChannel | null;
                                
                if (channel) {
                    const avatar = member.user.displayAvatarURL({ extension: 'png', size: 512 });
                    const welcomeLayout = getVanityWelcomeLayout(member.id, vanityRoleId, avatar, vanityString);
                                        
                    try {
                        const webhookClient = await getVanityWebhook(channel);
                        if (webhookClient) await webhookClient.send(welcomeLayout as any);
                        logger.info(`[VANITY] Message sent successfully`);
                    } catch (err) {
                        logger.error(`[LOG-ERROR] ${err}`);
                    }
                }
            } else {
                logger.warn(`[VANITY] No logChannelId configured for guild ${guild.id}`);
            }

        } else if (!hasVanity && hasRole) {
            await member.roles.remove(role);
            logger.info(`➖ [VANITY] Role removed from ${member.user.tag}`);
        }

    } catch (error: any) {
        if (error.code === 50013) {
            logger.error(`[VANITY] Permission Error: Bot cannot manage roles in ${guild.name}. Check hierarchy.`);
        } else {
            logger.error(`[VANITY] Unexpected error in checkVanity:`, error);
        }
    }
}