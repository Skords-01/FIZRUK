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

## Excluded by design: Architecture Decision Records (`docs/adr/**`)

ADRs are **deliberately excluded** from the freshness allowlist. An ADR captures
the context, alternatives, and rationale of a decision **at the moment it was
made**. It is a historical record, not a living document — once accepted, an
ADR is immutable.

When the underlying decision changes, the workflow is:

1. Write a new ADR that describes the new decision with current context.
2. Set `Status: Accepted` on the new ADR and `Status: Superseded by ADR-NNNN`
   on the old one.
3. Add a `Supersedes: ADR-MMMM` line in the new ADR header.

This is the standard pattern from Michael Nygard's
[original ADR proposal](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
and the [adr.github.io](https://adr.github.io/) community.

Reviewing every ADR on a 90-day cadence would either (a) produce trivial "still
accurate" updates that bury real changes, or (b) tempt editors to silently
rewrite history. Both outcomes defeat the purpose of an ADR.

The `Last reviewed:` line found in some ADRs (legacy `Date:` companion in the
header) is informational only — the freshness check script does **not** scan
ADR files, and the nightly workflow will not open issues against them.

If an ADR ever needs operational metadata that should be re-validated on a
cadence (e.g. a quota table, a price list), extract that data into a regular
doc under `docs/integrations/`, `docs/launch/`, or `docs/observability/` and
add **that** file to the allowlist — leave the ADR itself untouched.

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
