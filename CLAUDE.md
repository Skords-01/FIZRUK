# Sergeant — Claude Code context

> Full agent rules, hard rules, anti-patterns, and domain invariants are in **[`AGENTS.md`](./AGENTS.md)**.
> This file adds Claude Code–specific context on top of it.

## Repo snapshot

- **pnpm 9** + **Turborepo** monorepo, Node 20, TypeScript 6.
- **Apps:** `apps/web` (Vite + React 18), `apps/server` (Express + PostgreSQL), `apps/mobile` (Expo 52), `apps/mobile-shell` (Capacitor), `apps/console` (Telegram bot, grammy + Anthropic).
- **Packages:** `@sergeant/shared`, `@sergeant/api-client`, `@sergeant/config`, `@sergeant/design-tokens`, `@sergeant/insights`, 4 domain packages.
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
pnpm gen                 # Plop code generators (migration, rq-hook, hubchat-tool, endpoint)
```

## Before you write code

> Hard Rule #11 in `AGENTS.md` applies to AI agents: complete this pre-flight before implementing.

1. Read the relevant playbook in `docs/playbooks/` — pick by trigger phrase (e.g. "нова API-функціональність" → `add-api-endpoint.md`; "remove dead code" → `cleanup-dead-code.md`).
2. Check `AGENTS.md` § Hard rules — especially bigint coercion (#1), RQ keys (#2), migration numbering (#4), lifecycle markers (#10), governance + docs discipline (#11).
3. Before deleting any file, run `pnpm dead-code:files` (which honours `@scaffolded`/`@deprecated` markers) — never delete a `@scaffolded` file just because knip says it's unused.
4. New HubChat tool? Needs **3 coordinated edits** — see `docs/playbooks/add-hubchat-tool.md`.
5. New migration? Use `pnpm gen migration --name <desc>` — auto-numbers from last migration (`015`).
6. Before opening the PR, update docs that the change invalidates (api-client types, design-system, audits, playbooks, the freshness header). Docs are part of the change set.

## Verification before PR

```bash
pnpm format:check   # Prettier
pnpm lint           # ESLint
pnpm typecheck      # TypeScript
pnpm --filter <package> exec vitest run <path>   # affected tests
```

## Branch & commit

- Feature branches: `devin/<unix-ts>-<area>-<desc>` or `claude/<desc>`.
- Commits: Conventional Commits with explicit scope — `feat(web):`, `fix(server):`, `ci(web):`, etc. Full scope list in `AGENTS.md` § Hard rules #5.

## Deployment

- **Frontend:** Vercel — auto-deploys on push to `main`.
- **Backend:** Railway via `Dockerfile.api` — pre-deploy runs `pnpm db:migrate`.
- **Local DB:** `pnpm db:up` → PostgreSQL on `:5432` (`postgresql://hub:hub@localhost:5432/hub`).

## Secrets needed for full local dev

```
ANTHROPIC_API_KEY=       # Claude API
BETTER_AUTH_SECRET=      # 32+ chars, any string
AI_QUOTA_DISABLED=1      # skip quota checks locally
DATABASE_URL=postgresql://hub:hub@localhost:5432/hub
```

See `.env.example` for the full list.
