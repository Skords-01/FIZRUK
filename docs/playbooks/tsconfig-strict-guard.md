# Playbook: tsconfig strict guard

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

> Audit ID: **PR-1.A** | Added: 2026-04-27

## Purpose

The guard (`tools/tsconfig-guard/check.mjs`) prevents apps that inherit from
`packages/config/tsconfig.base.json` from silently overriding `strict`,
`noImplicitAny`, or `strictNullChecks` to a value that differs from the base.

It runs as a required CI job (`tsconfig-strict-guard`) on every push and PR.

## How it works

1. Finds every `apps/*/tsconfig.json`.
2. Resolves the full `extends` chain (supports `@sergeant/config/…` alias and
   relative paths).
3. Skips apps whose chain does **not** pass through `packages/config/`.
4. Computes the effective `compilerOptions` by merging the chain.
5. Compares guarded options against `packages/config/tsconfig.base.json`.
6. If an option differs, checks `tools/tsconfig-guard/allowlist.json`.
7. Exits non-zero with a clear message if any drift is unallowlisted or the
   allowlist entry has expired.

## Adding an exception to the allowlist

Edit `tools/tsconfig-guard/allowlist.json` and add an entry:

```json
{
  "path": "apps/web",
  "option": "strict",
  "value": false,
  "reason": "PR-6.C in flight — migrating to strict: true",
  "expires": "2026-05-27"
}
```

| Field     | Required | Description                                         |
| --------- | -------- | --------------------------------------------------- |
| `path`    | yes      | Relative app path, e.g. `apps/web`                  |
| `option`  | yes      | Compiler option name (`strict`, `noImplicitAny`, …) |
| `value`   | yes      | The allowed override value (e.g. `false`)           |
| `reason`  | yes      | Why this exception exists (link PR if possible)     |
| `expires` | yes      | ISO date after which the entry is considered stale  |

## Revalidation cycle

Every quarter (or when an `expires` date triggers a CI failure):

1. Review all entries in `allowlist.json`.
2. If the underlying PR has merged and the override is gone, remove the entry.
3. If the migration is still in progress, extend `expires` by up to 90 days and
   update the `reason` field.
4. Any entry older than 6 months without progress should be escalated.

## CODEOWNERS

Changes to the following paths require approval from `@Skords-01`:

- `apps/*/tsconfig.json`
- `packages/config/**`
- `tools/tsconfig-guard/**`

## Running locally

```bash
node tools/tsconfig-guard/check.mjs
```

## Unit tests

```bash
npx vitest run tools/tsconfig-guard/__tests__/check.test.mjs
```
