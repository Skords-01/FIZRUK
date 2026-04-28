# ADR 0026: n8n Workflow Source of Truth

## Status

Accepted

## Context

Sergeant keeps operational automations in n8n. Several workflows are now security-sensitive because they receive third-party webhooks, call internal APIs, or send alerts. Manual UI-only edits make it hard to review risk, required secrets, credentials, and production readiness.

## Decision

Git is the source of truth for n8n workflows.

- Workflow JSON lives in `ops/n8n-workflows/`.
- `ops/n8n-workflows/manifest.json` records owner, status, risk tier, required env vars, and required credentials.
- CI must run `pnpm ops:n8n:validate`.
- Production workflows stay inactive in git by default. Activation is an environment operation after credentials and secrets are verified.
- UI edits are temporary. Any UI change that should survive must be exported back to git with `pnpm n8n:export`.
- Imports should use `pnpm n8n:import -- --dry-run` before mutating a live n8n instance.

## Consequences

Reviewers can reason about workflow drift in pull requests. The manifest becomes the checklist for deployment readiness, and the validator blocks obvious unsafe states such as active workflow JSON, missing manifest entries, orphaned connections, or public Mono webhook ownership in n8n.
