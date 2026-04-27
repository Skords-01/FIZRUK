# Document Freshness Tracking

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

This system ensures critical documentation stays up-to-date by embedding
freshness headers and running a nightly check that opens GitHub issues for
overdue docs.

---

## How it works

1. **Freshness header** — each tracked document has a blockquote near the top:

   ```markdown
   > **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.
   ```

2. **Allowlist** — `scripts/docs/freshness-allowlist.json` lists every tracked
   file with its review cadence (days):

   ```json
   [
     { "path": "README.md", "cadenceDays": 90 },
     { "path": "docs/observability/runbook.md", "cadenceDays": 60 }
   ]
   ```

3. **Nightly workflow** — `.github/workflows/docs-freshness.yml` runs
   `scripts/docs/check-freshness.mjs` daily at 07:00 UTC. For each file whose
   **Next review** date has passed, it opens a GitHub issue with labels
   `documentation` and `freshness-overdue`.

4. **Idempotency** — the script embeds a marker comment
   (`<!-- doc-freshness:<path> -->`) in the issue body. Before creating a new
   issue it searches for an existing open issue with the same marker and skips
   if found.

---

## Supported header formats

| Format    | Example                                                                   | Notes                                                  |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| Canonical | `> **Last validated:** 2026-04-27 by @user. **Next review:** 2026-07-26.` | Preferred. Contains explicit next-review date.         |
| Legacy    | `> Last reviewed: 2026-04-27. Reviewer: @user`                            | AGENTS.md style before PR-11.A. No explicit next date. |

When a legacy header is found, the script computes the next review date as
`lastValidated + cadenceDays` from the allowlist.

---

## Adding a document to the freshness list

1. Add the freshness header to the document (right after the title):

   ```markdown
   # My Document

   > **Last validated:** YYYY-MM-DD by @yourhandle. **Next review:** YYYY-MM-DD.
   ```

   Compute the next-review date as `today + cadenceDays`.

2. Add an entry to `scripts/docs/freshness-allowlist.json`:

   ```json
   { "path": "docs/my-document.md", "cadenceDays": 90 }
   ```

3. Commit both changes in the same PR.

---

## Changing cadence

Edit the `cadenceDays` field in `scripts/docs/freshness-allowlist.json`. Update
the **Next review** date in the document header to match. Recommended cadences:

| Cadence | Use for                                                      |
| ------- | ------------------------------------------------------------ |
| 60 days | High-criticality ops docs (runbook, hotfix, secret rotation) |
| 90 days | Standard docs (README, CONTRIBUTING, SLO, playbooks index)   |

---

## Running locally

```bash
# Dry run (no issues created)
DRY_RUN=1 node scripts/docs/check-freshness.mjs

# Real run (requires GITHUB_TOKEN with issues:write)
GITHUB_TOKEN=ghp_... node scripts/docs/check-freshness.mjs
```

---

## Running tests

```bash
node --test scripts/docs/__tests__/check-freshness.test.mjs
```
