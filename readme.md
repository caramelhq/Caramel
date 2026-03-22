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

Caramel is a modular Discord bot built with [Sapphire Framework](https://sapphirejs.dev/) and TypeScript. Designed from the ground up with clean architecture, async job processing, and a two-layer caching system — built to scale.

Includes a **Next.js 16 web dashboard** for guild configuration, moderation logs, and more.

---

## Features

- **Vanity Tracker** — Detects custom status keywords and automatically assigns/removes roles. Jobs processed asynchronously via BullMQ.
- **Moderation** — Full suite: warn, mute, ban, softban, kick, timeout, unmute, slowmode, lockdown, history. Supports both slash commands and message prefix.
- **Silent Ban** — Silently restricts users from sending messages or joining voice without notifying them. Rate-limit escalation with progressive timeouts.
- **Auto-Mute Restore** — Reapplies active mutes on rejoin, with automatic expiry via background worker.
- **Module System** — Each feature is an independent module. Enable, disable, configure, or factory reset per guild without affecting others.
- **Web Dashboard** — Next.js 16 App Router with Discord OAuth, guild management, and module configuration.

---

## Stack

| Layer     | Technology                  |
| --------- | --------------------------- |
| Runtime   | Node.js + TypeScript        |
| Framework | Sapphire Framework          |
| Database  | PostgreSQL via Prisma       |
| Cache     | Redis (ioredis)             |
| Queue     | BullMQ                      |
| Logger    | Pino                        |
| Web       | Next.js 16, Tailwind CSS 4  |
| Auth      | NextAuth v5 (Discord OAuth) |
| UI        | shadcn/ui (Radix)           |

---

## Architecture

```
src/                    Bot source (TypeScript, CommonJS)
├── commands/           Slash + prefix commands, grouped by module
│   ├── config/         Module management (setup, enable, disable, reset)
│   └── mod/            Moderation commands
├── database/
│   ├── CacheManager    Redis sync layer
│   ├── Redis           ioredis setup + container attachment
│   └── db              Prisma client init + connection
├── lib/
│   ├── constants/      Shared constants (emojis)
│   └── utils/          Layouts, mod utils, vanity logic, queues, rate limiting
├── listeners/          Discord event handlers
├── services/           Business logic (SilentBanService)
├── structures/         CaramelClient (custom Sapphire client)
├── validators/         Module pre-enable validation
├── workers/            Background workers (Vanity, SilentBan, Mute)
└── index.ts            Bootstrap entry point

web/                    Next.js 16 App Router dashboard
├── scripts/            Postinstall helpers (Prisma client copy)
├── src/app/            Route handlers + pages (dashboard, docs, API)
├── src/components/ui/  shadcn/ui components
├── src/lib/            Auth, Prisma, Redis, Discord API helpers
└── src/sections/       Landing page sections

prisma/
├── schema.prisma       Database schema (PostgreSQL)
└── migrations/         Migration history

docker-compose.yml      Local PostgreSQL 15 + Redis
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) and Docker Compose
- A [Discord Application](https://discord.com/developers/applications) with:
  - Bot token
  - OAuth2 client ID and secret
  - Redirect URI configured (e.g. `http://localhost:3000/api/auth/callback/discord`)

### 1. Clone the repository

```bash
git clone https://github.com/CaramelHQ/Caramel.git
cd Caramel
```

### 2. Start infrastructure

Start PostgreSQL and Redis via Docker Compose:

```bash
docker compose up -d
```

This creates:

| Service    | Container                 | Host port | Internal port |
| ---------- | ------------------------- | --------- | ------------- |
| PostgreSQL | `CaramelLabs-PostGres-01` | **5433**  | 5432          |
| Redis      | `CaramelLabs-Redis-01`    | **6380**  | 6379          |

Verify they're running:

```bash
docker compose ps
```

### 3. Configure environment variables

#### Bot — root `.env`

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. Pay attention to the **ports** — they must match docker-compose:

```env
# Discord
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

# Database — port 5433, NOT 5432
DATABASE_URL=postgresql://admin:secure_password@localhost:5433/Caramellabs_db_dev

# Redis — port 6380, NOT 6379
REDIS_URL=redis://localhost:6380
```

#### Web dashboard — `web/.env.local`

```bash
cp web/.env.example web/.env.local
```

Edit `web/.env.local`. Use the **same database and Redis ports** as the bot:

```env
DATABASE_URL=postgresql://admin:secure_password@localhost:5433/Caramellabs_db_dev
REDIS_URL=redis://localhost:6380

# Discord OAuth2
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token

# NextAuth — generate a secret with: openssl rand -hex 32
AUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000
```

See `web/.env.example` for all available variables.

### 4. Install dependencies

```bash
# Install all dependencies (root + web workspace)
pnpm install

# Install web workspace dependencies
cd web
pnpm install
cd ..
```

> **How Prisma works in this monorepo:** The Prisma schema lives at `prisma/schema.prisma`
> in the root. Both the bot and the web dashboard share the same `@prisma/client`.
>
> With pnpm, `prisma generate` places the generated `.prisma/client` inside pnpm's
> content-addressable store — not in `web/node_modules/.prisma/client` where Next.js
> expects it. The web workspace's `postinstall` script handles this automatically by
> running `prisma generate` and then executing `scripts/copy-prisma-client.js`, which
> locates the generated client in the pnpm store and copies it to `web/node_modules/.prisma/client`.
>
> If you see `Cannot find module '.prisma/client/default'`, see [Troubleshooting](#troubleshooting).

### 5. Set up the database

```bash
# Generate the Prisma client (bot)
npx prisma generate

# Apply all migrations to the database
npx prisma migrate deploy
```

Verify the database is set up correctly:

```bash
# Optional — open Prisma Studio to browse your data
npx prisma studio
```

### 6. Start development

Open two terminals:

```bash
# Terminal 1 — Bot (hot-reload via tsx)
pnpm run dev

# Terminal 2 — Web dashboard (Next.js dev server)
pnpm run web:dev
```

The web dashboard will be available at `http://localhost:3000`.

---

## Scripts Reference

### Bot (root)

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `pnpm run dev`   | Start bot with hot-reload (tsx)   |
| `pnpm run build` | Compile TypeScript to `dist/`     |
| `pnpm run start` | Start production bot from `dist/` |

### Web dashboard

| Command              | Description              |
| -------------------- | ------------------------ |
| `pnpm run web:dev`   | Start Next.js dev server |
| `pnpm run web:build` | Production build         |
| `pnpm run web:start` | Start production server  |

### Database

| Command                                | Description              |
| -------------------------------------- | ------------------------ |
| `npx prisma generate`                  | Regenerate Prisma client |
| `npx prisma migrate deploy`            | Apply pending migrations |
| `npx prisma migrate dev --name <name>` | Create a new migration   |
| `npx prisma studio`                    | Open database GUI        |

---

## Module Setup

Caramel uses a module system. Each feature must be configured and enabled per guild:

```
/module setup name:Vanity Tracker
/module setup name:Moderation
/module enable name:Vanity Tracker
/module settings name:Moderation
/module reset name:Moderation
```

---

## Commands

### Server — `/`

| Command     | Description                        |
| ----------- | ---------------------------------- |
| `language`  | Change the server's language       |
| `prefix`    | Change the server's prefix         |

### Moderation — `/mod` or `c!mod`

| Command      | Description                        |
| ------------ | ---------------------------------- |
| `warn`       | Warn a member                      |
| `mute`       | Mute with role                     |
| `timeout`    | Discord native timeout             |
| `unmute`     | Remove timeout or mute             |
| `ban`        | Ban a member                       |
| `unban`      | Unban a member                     |
| `softban`    | Ban + unban to clear messages      |
| `kick`       | Kick a member                      |
| `silentban`  | Add / remove / list silent bans    |
| `slowmode`   | Set channel slowmode               |
| `lockdown`   | Toggle channel lockdown            |
| `history`    | View sanction history              |
| `user`       | View user information              |
| `case`       | View a specific case (#)           |
| `remove-case`| Remove a specific case (#)         |

### Thresholds — `/threshold` or `c!threshold`

| Command      | Description                            |
| ------------ | -------------------------------------- |
| `add`        | Add a threshold rule                   |
| `list`       | Show all the threshold rules           |
| `remove`     | Remove a threshold rule                |
| `mode`       | Change the behaviour of the thresholds |

### Config — `/module`

| Command     | Description                      |
| ----------- | -------------------------------- |
| `setup`     | Interactive module setup (modal) |
| `settings`  | View current configuration       |
| `enable`    | Enable a module                  |
| `disable`   | Disable a module                 |
| `reset`     | Factory reset a module           |

### Fun — `/` or `c!`

| Command     | Description                      |
| ----------- | -------------------------------- |
| `banana`    | Check your banana size           |
| `roll`      | Throw a die                      |

### Automod — `/automod rule` or `c!automod rule`

| Command     | Description                      |
| ----------- | -------------------------------- |
| `add`       | Add a new rule                   |
| `edit`      | Edit an existing rule            |
| `delete`    | Delete a rule                    |
| `list`      | Show your active rules           |
| `import`    | Import presets of rules          |

### Music  — `/` or `c!`

| Command     | Description                      |
| ----------- | -------------------------------- |
| `play`      | Play a song, any                 |
| `skip`      | Jump to the next song            |
| `queue`     | Show the current song queue      |
| `loop`      | Toggle loop mode for tracks      |
| `shuffle`   | Randomize the music queue        |
| `stop`      | Stop the music                   |
| `pause`     | Pause or resume a track          |
| `lyrics`    | Show the current track lyrics    |


---

## Troubleshooting

### `Cannot find module '.prisma/client/default'` (web)

This happens when the generated Prisma client is missing from `web/node_modules/.prisma/client`.
With pnpm's strict module isolation, `prisma generate` places the output inside pnpm's
content-addressable store, not where Next.js (Turbopack) can resolve it.

**Fix — run the postinstall script manually:**

```bash
cd web
pnpm run postinstall
```

This runs `prisma generate` and the `scripts/copy-prisma-client.js` helper that copies
the generated client to the correct location.

**Alternative — regenerate and copy manually:**

```bash
# From root — generate for the bot
npx prisma generate

# From web/ — generate and copy for the dashboard
cd web
npx prisma generate --schema=../prisma/schema.prisma
node scripts/copy-prisma-client.js
```

### Database connection refused (`ECONNREFUSED`)

This usually means the port in your `DATABASE_URL` doesn't match what Docker is exposing.

docker-compose maps PostgreSQL to **port 5433** and Redis to **port 6380** on the host.
A common mistake is using the default ports (5432 / 6379) instead.

```bash
# Verify containers are running
docker compose ps

# Both .env files must use the correct ports:
#   DATABASE_URL=postgresql://admin:secure_password@localhost:5433/Caramellabs_db_dev
#   REDIS_URL=redis://localhost:6380
```

**Important:** Make sure `web/.env.local` uses the **same ports** as the root `.env`.
The web dashboard connects to the same PostgreSQL and Redis instances as the bot.

### `Cross origin request detected` warning (Next.js dev)

When using a tunnel (e.g. ngrok), add your domain to `next.config.ts`:

```typescript
const nextConfig = {
  allowedDevOrigins: ["your-domain.ngrok-free.dev"],
};
```

---

## License

MIT
