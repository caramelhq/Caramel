```
  ██████╗ █████╗ ██████╗  █████╗ ███╗   ███╗███████╗██╗
 ██╔════╝██╔══██╗██╔══██╗██╔══██╝████╗ ████║██╔════╝██║
 ██║     ███████║██████╔╝███████║██╔████╔██║█████╗  ██║
 ██║     ██╔══██║██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ██║
 ╚██████╗██║  ██║██║  ██║██║  ██║██║ ╚═╝ ██║███████╗███████╗
  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝
```

> _make it simple — make it perfect._

---

## Overview

Caramel is a modular Discord bot built with the [Sapphire Framework](https://sapphirejs.dev/) and TypeScript, backed by PostgreSQL and Redis.

It is deliberately small. Three modules ship today — moderation, vanity tracker and tickets — and each one can be set up, enabled, disabled or factory reset per guild without touching the others. New modules are added on top of that seam rather than bolted onto a monolith.

---

## Modules

**Moderation** — Seventeen commands covering warn, mute, timeout, ban, softban, tempban, silent ban, kick and their reversals, plus channel slowmode and lockdown. Every action is recorded as a numbered case. Escalation thresholds turn repeated sanctions into automatic ones (N warns → mute, N mutes → ban), and a three-tier permission system decides who may run what: native Discord permissions, per-role and per-member overrides, then Bot Commanders.

**Vanity Tracker** — Watches custom statuses for a configured keyword and grants or removes a reward role accordingly. Role changes are queued through BullMQ so presence traffic never blocks the gateway.

**Tickets** — A panel users open tickets from, supporter claiming, message transcripts, and scheduled auto-close for inactive threads.

---

## Stack

| Layer     | Technology            |
| --------- | --------------------- |
| Runtime   | Node.js + TypeScript  |
| Framework | Sapphire Framework    |
| Database  | PostgreSQL via Prisma |
| Cache     | Redis (ioredis)       |
| Queue     | BullMQ                |
| Logger    | Pino                  |

---

## Architecture

```
src/
├── index.ts             Bootstrap: Prisma, Redis, workers, stats server, login
├── structures/          CaramelClient (custom Sapphire client)
├── commands/            Thin entry points — slash registration and delegation
│   ├── mod/             Moderation commands
│   ├── config/          language, prefix, mention, module
│   └── admin/           bot-commander
├── command-helpers/     Business logic — the real weight lives here
│   ├── mod/             sanctionFlow, permissionGuard, perms, thresholds
│   ├── config/module/   Per-module setup wizards and management
│   └── admin/
├── interaction-handlers/ Buttons and select menus
├── listeners/           Ready, PresenceUpdate, command errors, messages, tickets
├── workers/             BullMQ: Vanity, Mute, TempBan, SilentBan, Ticket
├── services/            SilentBanService
├── validators/          Module pre-enable validation
├── lib/
│   ├── layouts/         Discord Components V2 factories
│   ├── i18n/            en-US and es-ES strings
│   ├── constants/       Shared emojis
│   ├── structures/      CaramelUserError, CaramelSystemError
│   └── utils/           ModUtils, vanity, ticket helpers, queues
├── database/            Prisma client, Redis connection, CacheManager
└── api/                 Stats HTTP endpoint and uptime tracking

prisma/
├── schema.prisma        Database schema
└── migrations/          Migration history

docker-compose.yml       Local PostgreSQL 15 + Redis
```

Two ideas hold the codebase together:

- **Commands stay thin.** A file in `commands/` registers the slash command and delegates. Validation, execution and response building live in `command-helpers/`.
- **Redis is the hot path.** `Ready.ts` warms the cache from PostgreSQL at startup; after that, config reads are Redis hits. Every write to `GuildConfig` must be followed by `CacheManager.syncGuild()`.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v10+ (`corepack enable` picks up the pinned version)
- [Docker](https://www.docker.com/) and Docker Compose
- A [Discord Application](https://discord.com/developers/applications) with a bot token

### 1. Clone and configure

```bash
git clone https://github.com/CaramelHQ/Caramel.git
cd Caramel
cp .env.example .env
```

Fill in `.env`. At minimum you need `DISCORD_TOKEN`; the database and Redis values already point at what Compose provisions. Set `DEVELOPMENT_GUILD_IDS` to your test server's ID so slash commands appear there instantly instead of waiting on global propagation.

### 2. Start the infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL and Redis and waits for both to report healthy. Host ports are deliberately non-default so they don't collide with a local PostgreSQL or Redis:

| Container          | Service    | Host port | Internal port |
| ------------------ | ---------- | --------- | ------------- |
| `caramel-postgres` | PostgreSQL | **5433**  | 5432          |
| `caramel-redis`    | Redis      | **6380**  | 6379          |

### 3. Run the bot

The bot runs on your machine, not in Docker, so you can restart it freely:

```bash
pnpm install
npx prisma generate
npx prisma migrate deploy
pnpm run dev
```

`pnpm run dev` runs the bot through `tsx watch`, so it restarts on every save. The `DATABASE_URL` and `REDIS_URL` in `.env` already point at the two containers.

In VS Code, press **F5** instead — `.vscode/launch.json` ships two configurations, `Bot (debug)` with working breakpoints and `Bot (watch)` with hot-reload. Both bring the infrastructure up first, and `Ctrl+Shift+F5` restarts the bot.

Stopping the infrastructure:

```bash
docker compose down      # stop PostgreSQL and Redis
docker compose down -v   # ...and wipe their data volumes
```

Production is the exception — there the bot does run in a container, built from the `Dockerfile` and wired up in `docker-compose.prod.yml`.

---

## Scripts

| Command         | Description                     |
| --------------- | ------------------------------- |
| `pnpm run dev`   | Start with hot-reload (tsx)     |
| `pnpm run build` | Compile TypeScript to `dist/`   |
| `pnpm run start` | Run the production build        |

| Database command                       | Description              |
| -------------------------------------- | ------------------------ |
| `npx prisma generate`                  | Regenerate Prisma client |
| `npx prisma migrate deploy`            | Apply pending migrations |
| `npx prisma migrate dev --name <name>` | Create a new migration   |
| `npx prisma studio`                    | Open the database GUI    |

There are no automated tests. `pnpm run build` is the minimum check before calling a change done — `tsc` catches broken references across the whole tree.

---

## Module Setup

Nothing is active until you configure it. Each module is set up and enabled per guild:

```
/module setup    name:Moderation
/module enable   name:Moderation
/module settings name:Moderation
/module disable  name:Moderation
/module reset    name:Moderation
```

`setup` opens a modal, creating any missing roles or channels for you. `reset` removes the resources the bot created and clears the module's configuration.

---

## Commands

### Moderation — `/` or `c!`

| Command       | Description                            |
| ------------- | -------------------------------------- |
| `warn`        | Warn a member                          |
| `mute`        | Mute a member with the muted role      |
| `unmute`      | Remove a mute                          |
| `timeout`     | Discord native timeout                 |
| `untimeout`   | Remove a timeout                       |
| `kick`        | Kick a member                          |
| `ban`         | Ban a member                           |
| `unban`       | Unban a user                           |
| `softban`     | Ban and unban to clear recent messages |
| `tempban`     | Ban for a set duration                 |
| `silentban`   | Add, remove or list silent bans        |
| `slowmode`    | Set channel slowmode                   |
| `lockdown`    | Toggle channel lockdown                |
| `case`        | View a specific case                   |
| `remove-case` | Delete a case                          |
| `permission`  | Manage per-action moderation permissions |
| `threshold`   | Manage automatic escalation rules      |

### Configuration — `/`

| Command    | Description                               |
| ---------- | ----------------------------------------- |
| `module`   | Set up, enable, disable or reset a module |
| `language` | Change the server language                |
| `prefix`   | Change the server prefix                  |
| `mention`  | Customize the bot's mention response      |

### Admin — `/`

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `bot-commander` | Grant or revoke Bot Commander status         |

---

## Troubleshooting

### Database connection refused (`ECONNREFUSED`)

Almost always a port mismatch. Compose maps PostgreSQL to **5433** and Redis to **6380** on the host; the common mistake is using 5432 and 6379.

```bash
docker compose ps
```

### Slash commands do not appear

By default commands register globally, and global registration can take up to an hour to propagate. While developing, set `DEVELOPMENT_GUILD_IDS` in `.env` to a comma-separated list of guild IDs — commands register to those guilds instead and show up immediately. The bot must already be a member of every guild you list.

The startup log prints every command that loaded, so you can tell a broken command apart from one you are simply waiting on Discord to publish.

---

## License

MIT
