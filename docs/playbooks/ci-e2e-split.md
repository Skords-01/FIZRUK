# CI E2E split: critical-flow vs extended-flow

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

> Added by PR-10.B (audit item #16).

## Two E2E buckets

| Bucket            | Workflow                                 | Trigger                                                              | Timeout | Tests                          |
| ----------------- | ---------------------------------------- | -------------------------------------------------------------------- | ------- | ------------------------------ |
| **critical-flow** | `ci.yml` → `critical-flow` job           | every push / PR                                                      | 8 min   | `@critical`-tagged smoke tests |
| **extended-flow** | `extended-e2e.yml` → `extended-flow` job | nightly 02:00 UTC, `workflow_dispatch`, PR with `extended-e2e` label | 30 min  | `@extended`-tagged smoke tests |

## Test tagging convention

Tests in `apps/web/tests/smoke/` use title-level tags:

```ts
test("@critical auth: sign-up leads to authenticated hub surface", …);
test("@extended nav: module routes render (best-effort)", …);
```

Playwright `--grep @critical` / `--grep @extended` filters by these tags. Both buckets share the same `playwright.smoke.config.ts`.

## Current test assignments

### critical-flow (must-pass, every PR)

| File                       | Test                             | Rationale            |
| -------------------------- | -------------------------------- | -------------------- |
| `auth.spec.ts`             | sign-up → authenticated hub      | Core auth journey    |
| `dashboard-health.spec.ts` | dashboard renders without errors | SPA bootstrap health |
| `dashboard-health.spec.ts` | API health endpoint responds     | Backend liveness     |

### extended-flow (nightly)

| File                            | Test                 | Rationale                         |
| ------------------------------- | -------------------- | --------------------------------- |
| `navigation-offline-sw.spec.ts` | module routes render | Multi-module navigation edge case |
| `navigation-offline-sw.spec.ts` | OfflineBanner status | Offline mode, not merge-blocking  |
| `navigation-offline-sw.spec.ts` | SW debug roundtrip   | Service worker internals          |

## Adding new E2E tests

1. Create the test in `apps/web/tests/smoke/`.
2. Prefix the test title with `@critical` or `@extended`.
3. **Rule of thumb:** if a failure means users cannot sign in or see the dashboard, it is `@critical`. Everything else starts as `@extended`.

## Running locally

```bash
# critical only
pnpm --filter @sergeant/web exec playwright test -c playwright.smoke.config.ts --grep @critical

# extended only
pnpm --filter @sergeant/web exec playwright test -c playwright.smoke.config.ts --grep @extended

# all smoke tests (both buckets)
pnpm --filter @sergeant/web exec playwright test -c playwright.smoke.config.ts
```

## Nightly failure handling

When the nightly extended-flow fails, a GitHub issue is created automatically with the `flaky-extended-e2e` label. Investigate via the linked Actions run, then either fix or mark the test as flaky (see `docs/playbooks/stabilize-flaky-test.md`).
