# Caramel — Web Portal

The web portal for [Caramel](https://github.com/anomalyco/caramel), a modular Discord bot. Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, and Fumadocs.

## What's Inside

| Route                           | Description                                                               |
| ------------------------------- | ------------------------------------------------------------------------- |
| `/`                             | Landing page — hero, features, command list, stats, contact               |
| `/login`                        | Discord OAuth login via NextAuth.js v5                                    |
| `/dashboard`                    | Server picker — lists guilds the user can manage                          |
| `/dashboard/[guildId]`          | Guild overview — stats, recent mod actions, module status, activity chart |
| `/dashboard/[guildId]/modules`  | Enable / disable bot modules per server                                   |
| `/dashboard/[guildId]/logs`     | Paginated, searchable mod log table                                       |
| `/dashboard/[guildId]/settings` | Guild config — log channel, muted role, thresholds                        |
| `/docs`                         | Fumadocs documentation site                                               |

## Prerequisites

- Node.js v18+
- pnpm v10+ (uses pnpm workspaces — run commands from the **repo root**)
- PostgreSQL (port 5433 locally via docker-compose)
- A Discord application with OAuth2 configured

## Getting Started

From the **repo root**:

```bash
# Install all dependencies (bot + web)
pnpm install

# Start the Next.js dev server
pnpm run web:dev
```

The portal will be available at **http://localhost:3000**.

### Dev bypass mode

Set `NEXT_PUBLIC_DEV_BYPASS=true` in `web/.env.local` to skip Discord OAuth and use mock data. Useful for frontend development without a live bot or database.

## Environment Variables

Create `web/.env.local`:

```env
NEXT_PUBLIC_DEV_BYPASS=false

DATABASE_URL=postgresql://postgres:postgres@localhost:5433/Caramellabs_db_dev

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
AUTH_SECRET=               # 32+ char random string — generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
DISCORD_BOT_TOKEN=         # Bot token, used to fetch guild info via the Discord Bot API
```

## Scripts

All scripts run from the **repo root** via pnpm workspaces:

| Command                         | Description                          |
| ------------------------------- | ------------------------------------ |
| `pnpm run web:dev`              | Start Next.js dev server (Turbopack) |
| `pnpm run web:build`            | Production build                     |
| `pnpm run web:start`            | Serve production build               |
| `pnpm run lint --filter=web`    | Run ESLint (`next lint`)             |

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** — utility-first via `@tailwindcss/postcss`
- **NextAuth.js v5** — Discord OAuth 2.0
- **Prisma 7** — shared PostgreSQL database with the bot (read/write)
- **Fumadocs** — documentation site built from MDX files in `content/docs/`
- **shadcn/ui** — Radix UI-based component library in `src/components/ui/`
- **Recharts** — activity charts on the guild overview page
- **GSAP + Framer Motion** — landing page animations
- **TanStack Table** — mod log data table with pagination and filtering

## Project Structure

```
web/
├── content/docs/          # MDX documentation source files
├── public/                # Static assets (logo, images)
├── scripts/               # Postinstall helpers (Prisma client copy for pnpm)
├── src/
│   ├── app/               # Next.js App Router pages and API routes
│   │   ├── api/           # REST API routes (guilds, auth, search)
│   │   ├── dashboard/     # Dashboard pages ([guildId]/...)
│   │   ├── docs/          # Fumadocs pages
│   │   └── ...            # Landing, login, layout, globals.css
│   ├── components/
│   │   ├── ui/            # shadcn UI components
│   │   └── ...            # Navbar, GradientButton, LoadingScreen, SessionProvider
│   ├── hooks/             # React hooks (use-mobile, use-data-table-instance)
│   ├── lib/               # Shared utilities (auth, prisma, discord API, dev bypass)
│   └── sections/          # Landing page section components
├── next.config.ts
├── source.config.ts       # Fumadocs collection config
└── tsconfig.json
```

## Notes

- **Dark mode only** — enforced via `className="dark"` on `<html>`; no theme toggle.
- **No emojis** — Lucide React icons are used throughout.
- **Shared database** — the web portal and bot use the same PostgreSQL instance. Never add web-only migrations that break the bot schema.
- **Web/bot boundary** — do not import from the bot's `src/` into `web/src/` or vice versa.
- **Prisma + pnpm** — the `postinstall` script runs `prisma generate` and then `scripts/copy-prisma-client.js` to copy the generated client from pnpm's store into `web/node_modules/.prisma/client`. If you see `Cannot find module '.prisma/client/default'`, run `pnpm run postinstall` from the `web/` directory.
- Brand accent color: `#d77655` (Caramel orange).
