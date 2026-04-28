# Sergeant — Devin context

> Full agent rules, hard rules, anti-patterns, and domain invariants are in **[`AGENTS.md`](./AGENTS.md)**.
> This file adds Devin-specific context on top of it. For Claude Code see [`CLAUDE.md`](./CLAUDE.md).

## Repo snapshot

- **pnpm 9** + **Turborepo** monorepo, Node 20, TypeScript 6.
- **Apps:** `apps/web` (Vite + React 18), `apps/server` (Express + PostgreSQL), `apps/mobile` (Expo 52), `apps/mobile-shell` (Capacitor), `apps/console` (Telegram bot, grammy + Anthropic).
- **Packages:** `@sergeant/shared`, `@sergeant/api-client`, `@sergeant/config`, `@sergeant/design-tokens`, `@sergeant/insights`, `eslint-plugin-sergeant-design`, 4 domain packages (10 total).
- Language: code in English/Ukrainian mixed; prose docs in **Ukrainian** (see `AGENTS.md` § Soft rules).

## Quick commands

```bash
pnpm dev:server          # API on :3000
pnpm dev:web             # Vite on :5173 (proxies /api → :3000)
pnpm lint                # ESLint + imports + plugin tests
pnpm typecheck           # TypeScript
pnpm test                # Vitest all
pnpm check               # lint + typecheck + test + build (full CI)
pnpm db:up               # Start Postgres (Docker)
pnpm db:migrate          # Run migrations
pnpm gen                 # Plop generators (migration, rq-hook, hubchat-tool, endpoint)
pnpm format:check        # Prettier (CI uses this exact command)
```

## Before you write code

1. Pick the relevant playbook in [`docs/playbooks/`](docs/playbooks/) by trigger phrase. Decision-tree playbooks are marked 🌳 — start at Q1.
2. Check [`AGENTS.md` § Hard rules](AGENTS.md#hard-rules-do-not-break) — especially #1 (bigint→number coercion), #2 (RQ key factories), #4 (sequential migrations + two-phase DROP), #5 (commit scope enum), #8 (Tailwind opacity scale), #9 (`-strong` brand fills behind `text-white`).
3. New HubChat tool? Three coordinated edits — see [`docs/playbooks/add-hubchat-tool.md`](docs/playbooks/add-hubchat-tool.md).
4. New SQL migration? Use `pnpm gen migration --name <desc>` — auto-numbers from the last file under `apps/server/src/migrations/`.

## Devin-specific

### Skills (`.agents/skills/`)

Use the in-repo SKILL.md library when relevant: `better-auth-best-practices`, `vercel-react-best-practices`, `vercel-react-native-skills`, `supabase-postgres-best-practices`, `ui-ux-pro-max`, `vercel-composition-patterns`, `frontend-design`, `browser-use`, `brainstorming`, `find-skills`, `skill-creator`. Skills auto-load from [`.agents/skills/`](.agents/skills/) at session start.

### In-repo playbooks vs Devin-webapp macros

Single source of truth is [`docs/playbooks/`](docs/playbooks/). Several Devin-webapp playbooks exist as thin wrappers and **delegate** to the repo files — always defer to the in-repo one if there is any disagreement:

| Devin-webapp macro | In-repo playbook                                                                |
| ------------------ | ------------------------------------------------------------------------------- |
| `!rn_port`         | [`port-web-screen-to-mobile.md`](docs/playbooks/port-web-screen-to-mobile.md)   |
| `!rn_sync`         | [`sync-rn-migration-progress.md`](docs/playbooks/sync-rn-migration-progress.md) |
| `!fix_ci`          | [`fix-failing-ci.md`](docs/playbooks/fix-failing-ci.md)                         |
| `!docs_prettier`   | [`prettier-pass-on-docs.md`](docs/playbooks/prettier-pass-on-docs.md)           |

### Testing HubChat without UI

`apps/server` exposes `/api/chat`. To test a tool-call end-to-end without opening the web app:

```bash
curl -sS -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .devin-session-cookie)" \
  -d '{"messages":[{"role":"user","content":"<prompt>"}]}'
```

See [`CONTRIBUTING.md` § Working with HubChat locally](CONTRIBUTING.md) for the full curl recipe and how to inspect `tool_use` blocks in the response.

### Browser automation via CDP

A persistent Chrome runs at `http://localhost:29229` with CDP exposed. Attach Playwright with `p.chromium.connect_over_cdp("http://localhost:29229")` for SSO/OAuth flows or systematic data entry. Use `--user-data-dir=/home/ubuntu/.browser_data_dir` if you ever relaunch Chrome so the profile persists.

### Test users

Primary test user (staging dev DB): `I3BUW5atld8oOHM7lpFEJBIInpW1hzv7` — 6 Monobank accounts, ~2 246 ₴ on UAH cards. Do not destructively mutate this user's data.

## Verification before PR

```bash
pnpm format:check                                   # Prettier
pnpm lint                                           # ESLint
pnpm typecheck                                      # TypeScript
pnpm --filter <package> exec vitest run <path>      # affected tests
pnpm --filter @sergeant/web exec size-limit         # bundle budget (when touching apps/web)
pnpm licenses:check                                 # when bumping deps
```

## Branch & commit

- Feature branches: `devin/<unix-ts>-<area>-<desc>`.
- Commits: Conventional Commits with explicit scope from [`AGENTS.md` rule #5](AGENTS.md#5-conventional-commits-explicit-scope-enum). **Do not invent** scopes (e.g. `mobile/core`, `app`, `monorepo` — commitlint rejects).
- Never `--no-verify`, never `--amend`, never force-push shared branches (`AGENTS.md` rules #6, #7).

## Deployment

- **Frontend:** Vercel — auto-deploys on push to `main` (preview on every PR).
- **Backend:** Railway via `Dockerfile.api` — pre-deploy runs `pnpm db:migrate`. Health: `/health`. Migrations need `MIGRATE_DATABASE_URL` (public DB URL).
- **Local DB:** `pnpm db:up` → PostgreSQL on `:5432` (`postgresql://hub:hub@localhost:5432/hub`).

## Secrets needed for full local dev

```
ANTHROPIC_API_KEY=       # Claude API
BETTER_AUTH_SECRET=      # 32+ chars, any string
AI_QUOTA_DISABLED=1      # skip quota checks locally
DATABASE_URL=postgresql://hub:hub@localhost:5432/hub
```

See `.env.example` for the full list.
