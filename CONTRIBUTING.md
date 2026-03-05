# Contributing to Caramel

> _make it simple — make it perfect._

Thank you for your interest in contributing. This document covers everything you need to know to get started, write consistent code, and submit changes that fit naturally into the project.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Adding Features](#adding-features)
  - [Commands](#commands)
  - [Listeners](#listeners)
  - [Workers](#workers)
  - [Modules](#modules)
- [Database & Cache](#database--cache)
- [Submitting Changes](#submitting-changes)

---

## Prerequisites

- Node.js 18+
- PostgreSQL 15
- Redis
- Docker (optional, for local infrastructure)

---

## Getting Started

```bash
git clone https://github.com/youruser/caramel
cd caramel
npm install
cp .env.example .env   # fill in your values
```

Start the local infrastructure using Docker:

```bash
docker-compose up -d
```

Run the database migrations:

```bash
npx prisma migrate deploy
```

Start the bot in development mode:

```bash
npm run dev
```

---

## Project Structure

```
src/
├── commands/         # Slash + prefix commands, grouped by module
│   ├── config/       # Module management commands
│   ├── fun/          # Fun/easter egg commands
│   └── mod/          # Moderation commands
├── database/
│   ├── db.ts         # Prisma client setup + container attachment
│   ├── Redis.ts      # ioredis setup + container attachment
│   └── CacheManager  # Redis read/write abstraction
├── lib/
│   ├── constants/    # Shared constants (emojis)
│   └── utils/        # Layouts, mod utils, queues, rate limiting
├── listeners/        # Discord event handlers
├── services/         # Business logic layer
├── structures/       # CaramelClient (custom Sapphire client)
├── validators/       # Module pre-enable validation
├── workers/          # BullMQ and polling background workers
└── index.ts          # Bootstrap entry point
```

Keep each layer to its responsibility. Commands stay thin — heavy logic belongs in `services/` or `lib/utils/`. All Discord message formatting belongs in `lib/utils/layouts.ts`. All custom emojis belong in `lib/constants/emojis.ts`.

---

## Code Style

### TypeScript

- **`strict: true`** is enforced. No implicit `any`, no unchecked nulls.
- Use `type` imports when only importing a type: `import type { GuildConfig } from '@prisma/client'`.
- Non-null assertions (`!`) are acceptable only where existence has already been logically verified.
- `as any` casts should be avoided and used only as a last resort to work around library type gaps — add a comment explaining why.

### Naming

| Thing               | Convention                 | Example                                |
| ------------------- | -------------------------- | -------------------------------------- |
| Files               | `PascalCase`               | `ModCommand.ts`, `CacheManager.ts`     |
| Utility files       | `camelCase`                | `vanity.ts`, `roleQueue.ts`            |
| Classes             | `PascalCase` + type suffix | `ReadyListener`, `SilentBanService`    |
| Functions           | `camelCase`, verb-first    | `addVanityJob`, `parseDuration`        |
| Constants           | `SCREAMING_SNAKE_CASE`     | `DURATION_MAP`, `RATE_LIMIT_THRESHOLD` |
| Interfaces / Types  | `PascalCase`               | `ValidationResult`, `ModAction`        |
| Prisma model fields | `camelCase`                | `guildId`, `expiresAt`                 |
| DB columns          | `snake_case` (via `@map`)  | `guild_id`, `expires_at`               |

### Formatting

- 4-space indentation.
- Align related variable declarations visually using spaces where it aids readability.
- Use section comment headers to separate concerns within a file:

```typescript
// Constants ──────────────────────────────────────────────────────────────────

const DURATION_MAP = { ... };

// Helpers ─────────────────────────────────────────────────────────────────────

function parseDuration(...) { ... }
```

### Decorators

Prefer `@ApplyOptions` for commands and listeners:

```typescript
@ApplyOptions<Listener.Options>({ event: Events.GuildMemberAdd })
export class GuildMemberAddListener extends Listener { ... }
```

Use a manual constructor only when extra options (e.g., `once: true`) are needed and cannot be expressed in `@ApplyOptions`.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/). All messages must be lowercase.

```
<type>: <short imperative description>
```

| Type       | When to use                               |
| ---------- | ----------------------------------------- |
| `feat`     | New feature or behaviour                  |
| `fix`      | Bug fix                                   |
| `refactor` | Code change with no behaviour change      |
| `chore`    | Tooling, deps, config, non-source changes |
| `docs`     | Documentation only                        |

Examples:

```
feat: add slowmode subcommand to mod command
fix: only trigger vanity job when keyword is gained or lost
refactor: extract mute expiry logic into MuteWorker
chore: add prisma adapter dependency
docs: document module setup flow
```

Do not use a capital letter after the colon. Do not add a period at the end. Keep the description under 72 characters.

---

## Adding Features

### Commands

Commands live in `src/commands/<category>/`. Each command is one file, one exported class.

**Single-action command:**

```typescript
@ApplyOptions<Command.Options>({ name: "ping", description: "Pong." })
export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("ping").setDescription("Pong."),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply();
    // ...
    await interaction.editReply("Pong.");
  }
}
```

**Multi-action command** (use `Subcommand` from `@sapphire/plugin-subcommands`):

```typescript
@ApplyOptions<Subcommand.Options>({
    name: 'example',
    description: '...',
    subcommands: [
        { name: 'action', chatInputRun: 'chatInputAction' }
    ]
})
export class ExampleCommand extends Subcommand { ... }
```

**Rules:**

- Always `await interaction.deferReply()` before any async work in slash handlers.
- Always use `interaction.editReply()` after deferring — never `interaction.reply()`.
- Guard early: validate inputs and permissions before executing logic.
- Log errors with `this.container.logger.error('[CommandName] ...', err)`.
- Respond to the user on error with a consistent message (e.g., `` `🔴 An error occurred.` ``).
- If the command is moderation-related, call `validateMod()` and `requireModConfig()` before acting.

### Listeners

Listeners live in `src/listeners/`. Group message-related listeners inside `src/listeners/messages/`.

Name each listener class `<EventName>Listener`, matching the Discord.js event name.

```typescript
@ApplyOptions<Listener.Options>({ event: Events.GuildMemberRemove })
export class GuildMemberRemoveListener extends Listener {
  public async run(member: GuildMember) {
    if (member.user.bot) return;
    // ...
  }
}
```

**Rules:**

- Always bail early on bot users: `if (member.user.bot) return;` or `if (message.author.bot) return;`.
- Wrap Discord API calls in `try/catch` with a `[ListenerName]` log prefix.
- Keep listeners thin — delegate to `services/` or `lib/utils/` for non-trivial logic.

### Workers

Workers live in `src/workers/`. They are **factory functions**, not classes. The function must be called in the `bootstrap()` block of `index.ts` and the return value attached to `container`.

**BullMQ worker:**

```typescript
export function setupExampleWorker() {
  const workerConnection = new Redis({
    ...container.redis?.options,
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    "caramel-example",
    async (job: Job) => {
      // handle job
    },
    { connection: workerConnection as any, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    container.logger.error(`[ExampleWorker] Job failed: ${err.message}`);
  });

  worker.on("closed", async () => {
    await workerConnection.quit();
  });

  return worker;
}
```

**Rules:**

- Each BullMQ worker must create its own dedicated Redis connection (BullMQ requirement).
- Name queues with the `caramel-<feature>` prefix (e.g., `caramel-example`).
- Declare the corresponding `Queue` instance in `lib/utils/` — not in the worker file itself.
- Augment the `Container` interface in `@sapphire/pieces` to expose your worker on `container`.

### Modules

A "module" is a named, per-guild feature that can be set up, enabled, disabled, and reset via `/module` commands.

To add a new module:

1. **Schema** — Add the required fields to the `GuildConfig` model in `prisma/schema.prisma`. Follow the existing naming pattern (`<module>*` prefix, with `*CreatedByBot` flags for bot-managed resources). Run `npx prisma migrate dev --name add_<module>_fields`.

2. **Validator** — Add an entry to `ModuleValidators` in `src/validators/ModuleValidator.ts`. The validator must verify that all required Discord resources (roles, channels) still exist and return `{ isValid, missing? }`.

3. **Reset** — Add an entry to `RESET_MAP` in `src/commands/config/ModuleCommand.ts`. The reset function must clean up bot-created resources and null out DB fields.

4. **Cache** — Update `CacheManager` if the new module's config needs to be cached in Redis.

5. **Commands / Listeners** — Add the feature's command files and listeners following the patterns above.

---

## Database & Cache

- All schema changes must be made through Prisma migrations. Never modify the database directly.
- Every write to `GuildConfig` must be immediately followed by `CacheManager.syncGuild(guildId, updated)` to keep Redis in sync.
- Redis is the hot path for all reads. Only fall back to the database when the cache misses.
- Model field names use `camelCase`; all DB columns use `snake_case` mapped via `@map` and `@@map`.

---

## Submitting Changes

1. Fork the repository and create a branch from `main`.
2. Keep each pull request focused on a single feature or fix.
3. Ensure `npm run build` completes without TypeScript errors before opening a PR.
4. Write clear commit messages following the convention above.
5. Describe what your PR does and why in the pull request description.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
