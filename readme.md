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
| Logger    | Winston                     |
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
git clone https://github.com/youruser/caramel.git
cd caramel
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

> The web workspace's `postinstall` script automatically runs `prisma generate`
> and copies the generated client to the web's `node_modules`.

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

### Moderation — `/mod` or `c!mod`

| Command     | Description                        |
| ----------- | ---------------------------------- |
| `warn`      | Warn a member                      |
| `mute`      | Mute with role (supports duration) |
| `timeout`   | Discord native timeout             |
| `unmute`    | Remove timeout or mute             |
| `ban`       | Ban a member                       |
| `softban`   | Ban + unban to clear messages      |
| `kick`      | Kick a member                      |
| `silentban` | Add / remove / list silent bans    |
| `slowmode`  | Set channel slowmode               |
| `lockdown`  | Toggle channel lockdown            |
| `history`   | View sanction history              |

### Config — `/module`

| Command    | Description                      |
| ---------- | -------------------------------- |
| `setup`    | Interactive module setup (modal) |
| `settings` | View current configuration       |
| `enable`   | Enable a module                  |
| `disable`  | Disable a module                 |
| `reset`    | Factory reset a module           |

---

## Troubleshooting

### `Cannot find module '.prisma/client/default'` (web)

This happens when the web workspace can't find the generated Prisma client due to pnpm's
strict module isolation. Fix it by regenerating:

```bash
# From root
npx prisma generate

# From web/
cd web
npx prisma generate --schema=../prisma/schema.prisma
```

### Database connection refused

Verify Docker containers are running and your `.env` ports match `docker-compose.yml`:

```bash
docker compose ps

# DATABASE_URL must use port 5433 (not 5432)
# REDIS_URL must use port 6380 (not 6379)
```

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
