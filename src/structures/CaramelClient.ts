import '@sapphire/plugin-logger/register';
import { SapphireClient, container, LogLevel } from '@sapphire/framework';
import { GatewayIntentBits } from 'discord.js';
import winston from 'winston';
import { join } from 'path';


// Caramel client ──────────────────

export class CaramelClient extends SapphireClient {
    public constructor() {

        // Winston logger setup ──────────
        const winstonLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.printf(({ level, message }) => `${level} ${message}`)
                    )
                }),
                new winston.transports.File({ filename: 'logs/combined.log' }),
                new winston.transports.File({ filename: 'logs/errors.log', level: 'error' })
            ]
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
            defaultPrefix: process.env.PREFIX ?? 'p!',
            fetchPrefix: () => process.env.PREFIX ?? 'p!',
            baseUserDirectory: join(__dirname, '..'),
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
                        winstonLogger.info(message);
                    },
                    debug: (message: any) => winstonLogger.debug(message),
                    error: (message: any) => winstonLogger.error(message),
                    warn:  (message: any) => winstonLogger.warn(message),
                    fatal: (message: any) => winstonLogger.error(`[FATAL] ${message}`),
                    trace: (message: any) => winstonLogger.silly(message),
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