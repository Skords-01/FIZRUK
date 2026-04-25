# Agents in Sergeant

> Last reviewed: 2026-04-25. Reviewer: @Skords-01

## Repo overview

- **pnpm 9** + **Turborepo** monorepo, **Node 20**, **TypeScript 6**.
- **Apps** (4):
  - `apps/web` — Vite + React 18 SPA (frontend).
  - `apps/server` — Express + PostgreSQL (`pg`) + Better Auth (API).
  - `apps/mobile` — Expo 52 + React Native 0.76.
  - `apps/mobile-shell` — Capacitor wrapper for the web app.
- **Packages** (9): `@sergeant/shared`, `@sergeant/api-client`, `@sergeant/config`, `@sergeant/design-tokens`, `@sergeant/insights`, and 4 domain packages (`@sergeant/finyk-domain`, `@sergeant/fizruk-domain`, `@sergeant/nutrition-domain`, `@sergeant/routine-domain`).
- Pre-commit: **Husky** runs `lint-staged` (ESLint --fix + Prettier).

## Hard rules (do not break)

1. **DB types**: the `pg` driver returns `bigint` as **string**. Always coerce to `number` in the serializer (see [#708](https://github.com/Skords-01/Sergeant/issues/708)).
2. **RQ keys**: only via centralized factories in `apps/web/src/shared/lib/queryKeys.ts` — `finykKeys`, `nutritionKeys`, `hubKeys`, `coachKeys`, `digestKeys`, `pushKeys`. Never write hardcoded `["finyk", ...]`.
3. **API contract**: when changing a response shape in `apps/server/src/modules/*`, also update types in `packages/api-client/src/endpoints/*` AND add a test.
4. **SQL migrations**: sequential `NNN_*.sql` files in `apps/server/src/migrations/` (currently 001–008). No gaps. Pre-deploy job copies them via `apps/server/build.mjs` (fixed in [#704](https://github.com/Skords-01/Sergeant/issues/704)).
5. **Conventional Commits**: `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):`. Scope = package name without `@sergeant/` prefix.
6. **No force push to main/master.** `--force-with-lease` on feature branches is OK.
7. **Pre-commit hooks** via Husky — do not skip (`--no-verify` is forbidden).

## Soft rules (preferred)

- Branch naming: `devin/<unix-ts>-<short-area>-<desc>`. Example: `devin/1777137234-mono-bigint-coercion`.
- Tests next to code: `foo.ts` + `foo.test.ts` in the same folder (Vitest).
- Use path aliases (`@shared/*`, `@finyk/*`, etc.) instead of relative `../../../`.
- Dependency bumps — separate PRs (don't mix with features).
- When deleting a file — first `grep` its imports across the entire monorepo.

## Verification before PR

- `pnpm lint` — must be green.
- `pnpm typecheck` — must be green.
- `pnpm --filter <package> exec vitest run <path>` — for affected tests.
- When changing DB / API: `apps/server` tests must be green.
- When changing UI: take a screenshot and attach it to the PR description.

## Deployment

- **Frontend**: Vercel (preview deploy on each PR; free tier may rate-limit).
- **Backend**: Railway via `Dockerfile.api`. Pre-deploy: `pnpm db:migrate`. Health endpoint: `/health`.
- Migrations require `MIGRATE_DATABASE_URL` env (= public DB URL).

## Pre-existing flaky tests (do not block merge)

- `apps/mobile/src/core/OnboardingWizard.test.tsx`
- `apps/mobile/src/core/dashboard/WeeklyDigestFooter.test.tsx`
- `apps/mobile/src/core/settings/HubSettingsPage.test.tsx`

These three fail on `main`. Ignore them if your PR does not touch `apps/mobile`.

## Test users

- `I3BUW5atld8oOHM7lpFEJBIInpW1hzv7` — primary test user, 6 Monobank accounts, ~2 246 ₴ on UAH cards.

## See also

- `docs/monobank-roadmap.md`
- `docs/monobank-webhook-migration.md`
- `docs/frontend-tech-debt.md`
- `docs/backend-tech-debt.md`
- `docs/ai-coding-improvements.md`
- `docs/dev-stack-roadmap.md`
