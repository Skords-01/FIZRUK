# Flaky Tests Dashboard

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

Weekly automated report that tracks test stability across the Sergeant monorepo.

## How it works

1. **Every Monday at 06:00 UTC** (or on manual `workflow_dispatch`), the `flaky-tests-dashboard.yml` workflow runs.
2. **Collect job** — runs `vitest --reporter json` via Turborepo across all workspace packages and uploads the raw JSON reports as an artifact (`vitest-report-<run_number>`).
3. **Aggregate job** — downloads the current run's report plus up to 6 previous runs' artifacts via the GitHub API, then runs `scripts/flaky-tests/aggregate.mjs` to produce a markdown trend table.
4. The markdown is published in two places:
   - **`$GITHUB_STEP_SUMMARY`** — visible directly in the workflow run page on GitHub.
   - **Artifact** `flaky-tests-trend-<run_number>.md` — retained for 90 days.

## Reading the trend table

| Column    | Meaning                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File      | Source file containing the test (paths shortened to `apps/…` or `packages/…`).                                                                                                          |
| Test      | Full test name (`describe > it`).                                                                                                                                                       |
| Runs      | Number of distinct workflow runs where this test was executed.                                                                                                                          |
| Failures  | Total number of failed executions across all runs.                                                                                                                                      |
| Failure % | `failures / total_executions * 100`. A test that always fails scores 100%.                                                                                                              |
| Flaky %   | Same as failure rate, but only when the test has **both passes and failures** across runs. `0.0%` means the test either always passes or always fails — it is deterministic, not flaky. |

### Interpreting results

- **High Failure %, Flaky % = 0%** — the test is **consistently failing**. It may be broken on `main`. Check CI.
- **Moderate Failure %, Flaky % > 0%** — the test is **genuinely flaky**. It sometimes passes, sometimes fails. These are the primary targets for investigation.
- **Low Failure %** — occasional one-off failure, likely environmental (CI resource pressure, timeouts).

## Where artifacts are stored

- Navigate to [Actions → Flaky Tests Dashboard](../../actions/workflows/flaky-tests-dashboard.yml).
- Click on a completed run.
- Download `flaky-tests-trend-<N>.md` from the Artifacts section.
- Raw JSON reports are also available as `vitest-report-<N>` (retained 90 days).

## Known flaky tests (quarantine list)

The following tests are documented in [`AGENTS.md`](../../AGENTS.md) under "Pre-existing flaky tests (do not block merge)":

| Test file                                                    | Status      |
| ------------------------------------------------------------ | ----------- |
| `apps/mobile/src/core/OnboardingWizard.test.tsx`             | Known flaky |
| `apps/mobile/src/core/dashboard/WeeklyDigestFooter.test.tsx` | Known flaky |
| `apps/mobile/src/core/settings/HubSettingsPage.test.tsx`     | Known flaky |

These fail intermittently on `main`. If your PR does not touch `apps/mobile`, ignore them.

To **add a test to the quarantine list**, update the "Pre-existing flaky tests" section in `AGENTS.md`. The dashboard will still track these tests, but the quarantine list serves as documentation for contributors so they know which failures are pre-existing.

## Aggregation script

Located at `scripts/flaky-tests/aggregate.mjs`. Exports:

- `parseReport(report, runId)` — parse a single Vitest JSON report.
- `aggregate(allResults)` — group by `file > test`, compute failure/flaky rates.
- `renderMarkdown(rows, opts)` — render top-N markdown table.
- `aggregateFromDir(dir, opts)` — convenience: read all `*.json` from a directory, aggregate, render.

Unit tests: `scripts/flaky-tests/aggregate.test.ts` (run via `npx vitest run --config scripts/flaky-tests/vitest.config.ts`).

## Manual trigger

Go to [Actions → Flaky Tests Dashboard](../../actions/workflows/flaky-tests-dashboard.yml) → "Run workflow" → select branch → "Run workflow".
