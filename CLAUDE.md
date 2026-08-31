# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Sapphire Framework (Discord.js 14) |
| Language | TypeScript |
| Package manager | pnpm |
| DB | PostgreSQL (Prisma) + Redis (ioredis/BullMQ) |

## Commands

```bash
pnpm run dev    # Development with tsx watch
pnpm run build  # Compile TypeScript → dist/
pnpm run start  # Production with node dist/index.js
```

There are no automated tests. The minimum check before calling anything done is `pnpm run build` — `tsc` alone catches broken references across the tree. To actually exercise a change: `pnpm run dev` locally, or rebuild on the server.

## Infrastructure (server 137.184.66.155)

- Docker containers: `caramel-bot`, `caramel-postgres`, `caramel-redis`
- Files live in: `/opt/caramel/`
- **Correct deploy**: `cd /opt/caramel && git pull && docker compose -f docker-compose.prod.yml up -d --build bot`
  - ⚠️ `docker restart caramel-bot` does NOT work — the bot runs a Docker image baked from the Dockerfile
- Migrations: `npx prisma migrate deploy` (never `migrate dev` against production)
- SSH: `ssh root@137.184.66.155`

## Current scope

The bot is deliberately reduced to three modules. Music, AutoMod, the advanced logging system, Clan Tag and the fun/info commands were all removed.

| Module | What it does |
|--------|--------------|
| **Moderation** | Sanctions, cases, thresholds, custom permissions |
| **Vanity Tracker** | Grants a role to members displaying a keyword in their status |
| **Tickets** | Panel, opening, claiming, transcripts, auto-close |

Around them: guild configuration (`language`, `prefix`, `mention`, `module`) and infrastructure (Prisma, Redis, cache, StatsServer).

## Architecture

### Structure

```
src/
├── index.ts                          # Bootstrap: Prisma, Redis, workers, StatsServer, login
├── structures/
│   └── CaramelClient.ts              # Extended SapphireClient, Pino logging
├── commands/                         # Thin entry points: slash registration + delegation
│   ├── mod/                          # ban, kick, warn, mute, timeout, tempban, silentban,
│   │                                 # softban, unban, unmute, untimeout, case, remove-case,
│   │                                 # lockdown, slowmode, perms, threshold
│   ├── config/                       # language, prefix, mention, module
│   └── admin/bot-commander/          # Manages the BotCommander table (mod permissions)
├── command-helpers/                  # Business logic — the real weight lives here
│   ├── mod/
│   │   ├── shared/sanctionFlow.ts    # Record action + thresholds + confirmation
│   │   ├── shared/permissionGuard.ts # Validate action permissions by role/member
│   │   ├── perms/core/service.ts     # ModPermission CRUD
│   │   └── threshold/core/service.ts # ModThreshold CRUD
│   ├── config/module/core/           # setup/ (vanity, mod, tickets) + management/
│   │                                 # (enable, disable, reset, settings)
│   └── admin/bot-commander/core/
├── interaction-handlers/             # ModCaseHandler, TicketOpenHandler, TicketActionHandler
├── listeners/
│   ├── Ready.ts                      # Redis warm-up from PostgreSQL
│   ├── PresenceUpdate.ts             # Detects the vanity keyword → enqueues a job
│   ├── commands/                     # Command and interaction error handling
│   ├── messages/                     # MentionListener, TicketMessageListener, CommandDebug
│   └── tickets/                      # TicketChannelDeleteListener
├── workers/                          # BullMQ: Vanity, Mute, TempBan, SilentBan, Ticket
├── services/SilentBanService.ts
├── validators/ModuleValidator.ts     # Does the module have the minimum to be enabled?
├── lib/
│   ├── layouts/                      # Components V2 (ui.ts is the base for everything)
│   ├── i18n/{en-US,es-ES}/           # modcommands, modules, layouts, errors, admincommands
│   ├── constants/emojis.ts
│   ├── structures/Errors.ts          # CaramelUserError, CaramelSystemError
│   └── utils/                        # ModUtils, vanity, ticketUtils, ticketQueue,
│                                     # SilentBanQueue, emoji
├── database/
│   ├── db.ts                         # Prisma client
│   ├── Redis.ts                      # ioredis
│   └── CacheManager.ts               # Sync PostgreSQL → Redis
└── api/                              # StatsServer (/stats), UptimeTracker
```

### Code patterns

**Thin commands**: `commands/` only registers the slash command and delegates. The logic goes in `command-helpers/`. Always separate validation, execution and response.

**UI with Components V2**: Every message uses factories from `lib/layouts/ui.ts` — never classic embeds or `content`. Example: `ContainerComponent([TextDisplay(...), ActionRow(...)])`.

**I18n is mandatory**: All user-facing text goes through `resolveKey(interaction, 'namespace:key')` or `fetchT`. Never hardcode strings. Add the key to **both** locales (`en-US` and `es-ES`).

**Two-layer cache**:
- L1: Redis — guild configs cached at startup
- L2: PostgreSQL as fallback
- `Ready.ts` performs the full warm-up; after that everything is a Redis hit
- `CacheManager.syncGuild()` is the single source of truth for syncing configuration. Call it after any `prisma.guildConfig.update()`.

**Dual response**: Moderation commands return an ephemeral reply to the author plus a channel-visible message (separate layout). See `sanctionFlow.ts`.

**BullMQ workers**: Deferred or expiring operations (unmute, unban, ticket auto-close, vanity) are Redis jobs. They are instantiated in `index.ts` and attached to the Sapphire container (with their type declaration in the `declare module` block).

### Moderation system

`sanctionFlow.ts` in `command-helpers/mod/shared/` is the core:
1. Records the action in `ModLog`
2. Checks thresholds (how many warns → auto-mute → auto-ban?)
3. Builds the confirmation layout

`permissionGuard.ts` resolves access in three tiers: native Discord permissions → the `ModPermission` table (allow/deny per role or member and action) → `BotCommander` (equivalent to Administrator).

Thresholds (`ModThreshold`) drive automatic escalation: N warns → mute, N mutes → ban. `ModLog.isAutomatic` flags automatic sanctions so they don't feed back into the loop.

### Modules and configuration

`/module setup|settings|enable|disable|reset <module>` manages the three modules. Adding a new one means touching, in order:

1. `command-helpers/config/module/core/constants/index.ts` — `moduleIds` + `moduleChoices`
2. `command-helpers/config/module/core/setup/<module>Setup.ts` — the wizard
3. `command-helpers/config/module/core/index.ts` — export it
4. `commands/config/module/ModuleCommand.ts` — route it in `chatInputSetup`
5. `validators/ModuleValidator.ts` — what it needs before it can be enabled
6. `management/reset.ts` — its entry in `RESET_MAP` and in `getResetDeletions`
7. `lib/layouts/modCommandLayouts.ts` — its block in `getModuleLayout`
8. `database/CacheManager.ts` — its keys in `syncGuild`
9. `lib/i18n/{en-US,es-ES}/modules.json` — `displayNames` and `setup`
10. `lib/i18n/{en-US,es-ES}/layouts.json` — `settings.<module>`

The convention for the toggle field is `<moduleId>Module` on `GuildConfig`. Keeping it avoids translation maps.
