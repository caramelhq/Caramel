import { InternationalizationContext } from '@sapphire/plugin-i18next';
import { SapphireClient, container, LogLevel } from '@sapphire/framework';
import { ActivityType, GatewayIntentBits } from 'discord.js';
import pino from 'pino';
import { join } from 'path';
import { CacheManager } from '../database/CacheManager';


// Caramel client ──────────────────

export class CaramelClient extends SapphireClient {
    public constructor() {

        // Pino logger setup ──────────
        const pinoLogger = pino({
            level: 'trace',
            transport: {
                targets: [
                    {
                        target: 'pino-pretty',
                        options: { colorize: true, ignore: 'pid,hostname' },
                        level: 'info'
                    },
                    {
                        target: 'pino/file',
                        options: { destination: 'logs/combined.log', mkdir: true },
                        level: 'info'
                    },
                    {
                        target: 'pino/file',
                        options: { destination: 'logs/errors.log', mkdir: true },
                        level: 'error'
                    }
                ]
            }
        });

        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
            ],
            presence: {
                status: 'idle',
                activities: [
                    {
                        name: '🍬 in development',
                        type: ActivityType.Custom
                    }
                ]
            },
            defaultPrefix: process.env.PREFIX ?? 'c!',
            fetchPrefix: () => process.env.PREFIX ?? 'c!',
            loadMessageCommandListeners: true,
            baseUserDirectory: join(__dirname, '..'),
            i18n: {
                fetchLanguage: async (context: InternationalizationContext) => {
                    if (!context.guild) return 'en-US';
                    return await CacheManager.getLocale(context.guild.id);
                },
                defaultLanguageDirectory: join(process.cwd(), 'src', 'lib', 'i18n'),
                i18next: {
                    fallbackLng: 'en-US'
                }
            },
            allowedMentions: {
                repliedUser: false
            },
            applicationCommands: {
                developmentGuildIds: ['1195184839758975089'],
                registries: {
                    processLogging: {
                        logInit: false,
                        logSuccess: false
                    }
                }
            },
            logger: {
                instance: {
                    has: () => true,
                    info: (message: any) => {
                        if (typeof message === 'string' &&
                            (message.includes('ApplicationCommandRegistries') || message.includes('initialize'))) return;
                        pinoLogger.info(message);
                    },
                    debug: (message: any) => pinoLogger.debug(message),
                    error: (...args: any[]) => {
                        const formatted = args.map(arg => arg instanceof Error ? (arg.stack ?? arg.message) : arg).join(' ');
                        pinoLogger.error(formatted);
                    },
                    warn:  (...args: any[]) => pinoLogger.warn(args.join(' ')),
                    fatal: (message: any) => pinoLogger.fatal(`[FATAL] ${message}`),
                    trace: (message: any) => pinoLogger.trace(message),
                    run:   () => {},
                    level: LogLevel.Info
                } as any
            }
        } as any);
    }


    // Logs in and confirms the bot is online ──────────

    public async start(token: string) {
        try {
            await super.login(token);
            container.logger.info(`🍬 [BOT] Online as ${this.user?.tag}`);
        } catch (error) {
            container.logger.error('🔴 [CLIENT] Login failed:');
            console.error(error);
            throw error;
        }
    }
}
