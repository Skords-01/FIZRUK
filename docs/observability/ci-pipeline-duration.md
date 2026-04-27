# CI Pipeline Duration Dashboard

> Added by audit task **PR-10.A** (`ci: add p95 pipeline-duration metric to CI summary`).

## What it shows

Every CI run on a `pull_request` (from the same repo, not forks) automatically
posts (or updates) a comment with:

| Section               | Description                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Overall Pipeline**  | p50 / p95 / p99 of total pipeline duration, current run value, and deviation from p95.          |
| **Trend sparkline**   | ASCII sparkline of the last ≤ 20 runs to visualise direction.                                   |
| **Per-Job Breakdown** | Same metrics broken down by individual CI job (`check`, `coverage`, `a11y`, `smoke-e2e`, etc.). |
| **Threshold warning** | Highlighted when the current run exceeds **p95 + 20 %**.                                        |

The same data is also written to `$GITHUB_STEP_SUMMARY` so it appears in the
Actions run summary tab.

## How to read the trend

- The sparkline uses Unicode block characters (`▁▂▃▄▅▆▇█`). Lower blocks =
  faster runs; taller blocks = slower runs.
- A consistently rising trend signals pipeline degradation — investigate the
  slowest per-job rows.
- The **vs p95** column shows how the current run compares to the historical 95th
  percentile. Positive values (`+12.3 %`) mean the run is slower; negative
  values (`-4.1 %`) mean it is faster.

## Threshold configuration

The default threshold is **p95 + 20 %**. If the current run total exceeds this,
a warning banner appears in the comment.

To adjust:

1. Open `scripts/ci/pipeline-duration-p95.mjs`.
2. Find the threshold check:
   ```js
   if (currentTotal > totalStats.p95 * 1.2) {
   ```
3. Change `1.2` to your desired multiplier (e.g. `1.3` for p95 + 30 %).

## Sample size

By default, the script analyses the last **50** successful runs on the default
branch. To change this:

```js
const SAMPLE_SIZE = 50; // adjust as needed (max 100 per API page)
```

## Architecture

```
scripts/ci/pipeline-duration-p95.mjs   ← core logic (pure functions + GitHub API calls)
scripts/ci/pipeline-duration-p95.test.mjs ← Vitest unit tests (30 tests, mock fetch)
scripts/ci/vitest.config.mjs           ← minimal Vitest config for the script tests
.github/workflows/ci.yml               ← `pipeline-duration-summary` job
```

### CI job: `pipeline-duration-summary`

- **Runs after:** `check`, `coverage`, `a11y`, `smoke-e2e` (via `needs:`).
- **Condition:** `if: always()` — reports even when upstream jobs fail.
- **Fork safety:** The PR comment step only runs when
  `github.event.pull_request.head.repo.full_name == github.repository`.
- **Idempotent comments:** Uses the marker `<!-- ci-pipeline-duration-summary -->`
  to find and update an existing comment instead of creating duplicates.

### Permissions

The job requests `pull-requests: write` (at job level) to post/update PR comments.
All other jobs keep the workflow-level `contents: read` only.

## Running tests locally

```bash
npx vitest run scripts/ci/pipeline-duration-p95.test.mjs --config scripts/ci/vitest.config.mjs
```

## Troubleshooting

| Symptom                            | Cause                                           | Fix                                                                                |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| No comment posted on PR            | First run on a new repo with no historical data | Wait for ≥ 1 successful `main` run.                                                |
| "No historical runs found" in logs | The workflow file name or branch doesn't match  | Verify `ci.yml` is the correct workflow filename and `main` is the default branch. |
| Comment not updating               | Marker mismatch                                 | Ensure the marker `<!-- ci-pipeline-duration-summary -->` hasn't been altered.     |
| Job fails on fork PRs              | N/A — the comment step is skipped for forks     | Expected behaviour; the metrics step still runs and writes to step summary.        |
