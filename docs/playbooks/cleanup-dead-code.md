# Playbook: Cleanup Dead Code

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

**Trigger:** "Remove X and all its usages" / deleting a deprecated module, component, utility, or feature flag.

---

## Steps

### 1. Find all references

```bash
# Search the entire monorepo for the symbol/file name
grep -rn "<symbol_or_filename>" --include="*.{ts,tsx,js,jsx,mjs,cjs,json,md}" .

# Also check for re-exports and barrel files
grep -rn "from.*<module_path>" .
```

Make a list of every file that imports, references, or tests the target.

### 2. Delete the implementation

Remove the source file(s) or the specific export/function. If the target lives inside a larger file, remove only the relevant code — do not refactor unrelated sections.

### 3. Remove all imports and usages

Go through the reference list from step 1 and remove:

- `import` / `require` statements
- Call sites and JSX usages
- Type references
- Re-exports from barrel/index files

### 4. Remove associated tests and fixtures

Delete test files (`*.test.ts`, `*.test.tsx`) that exclusively tested the removed code. If a test file covers multiple things, remove only the relevant `describe`/`it` blocks.

### 5. Check for feature flags

If the removed code was gated behind a feature flag:

- Remove the flag entry from `FLAG_REGISTRY` in `apps/web/src/core/lib/featureFlags.ts`
- Remove all `useFlag("flag_name")` / `getFlag("flag_name")` call sites
- Update `docs/feature-flags.md` if it exists

### 6. Check for documentation references

Search docs for mentions of the removed code:

```bash
grep -rn "<symbol_or_filename>" docs/ README.md CONTRIBUTING.md AGENTS.md
```

Update or remove stale references.

### 7. Check for React Query key factories

If the removed code used React Query, ensure the corresponding key factory in `apps/web/src/shared/lib/queryKeys.ts` is cleaned up too (AGENTS.md rule #2).

### 8. Check for API contract changes

If the removed code included an API endpoint or response field:

- Update types in `packages/api-client/src/endpoints/*` (AGENTS.md rule #3)
- Add or update a test to confirm the field/endpoint no longer exists
- If a migration is needed, create sequential `NNN_*.sql` in `apps/server/src/migrations/` (AGENTS.md rule #4)

### 9. Verify

```bash
pnpm lint          # must be green
pnpm typecheck     # must be green
pnpm test          # must be green
pnpm build         # must succeed
```

### 10. Create the PR

- Branch: `devin/<unix-ts>-chore-remove-<thing>`
- Commit: `chore(<scope>): remove <thing>` (Conventional Commits — AGENTS.md rule #5)
- PR description must include:
  - Summary of files/lines deleted
  - Why the code is dead (no longer used, superseded by X, flag graduated)
  - Confirmation that all references were removed (paste grep output showing zero hits)

---

## Verification Checklist

- [ ] `grep -rn "<symbol>"` returns zero hits across the monorepo
- [ ] `pnpm lint` — green
- [ ] `pnpm typecheck` — green
- [ ] `pnpm test` — green (excluding known flaky mobile tests per AGENTS.md)
- [ ] `pnpm build` — succeeds
- [ ] No orphaned query key factories in `queryKeys.ts`
- [ ] No orphaned API client types in `packages/api-client`
- [ ] Documentation updated (if applicable)

## Tools

- **Knip** (`pnpm knip`) — automated dead code / unused export detection. Run before and after to confirm the cleanup is complete.
- **depcheck** (`pnpm depcheck:all`) — finds unused dependencies across packages.

## Notes

- Always delete in a separate PR — do not mix with feature work (AGENTS.md soft rule).
- If removing a file, first confirm it is not dynamically imported (check for `import()` expressions).
- When in doubt, `pnpm check` (the full CI suite) is the definitive verification.
