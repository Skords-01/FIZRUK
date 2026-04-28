# ADR 0027: OpenClaw, Console, and MCP Policy

## Status

Accepted

## Context

OpenClaw started as launch prose, while `apps/console` now exists as an internal Telegram admin tool. Without a policy, every AI or MCP-related PR has to re-decide whether the console is a product surface, which tools can mutate data, and how prompt changes are versioned.

## Decision

Phase 1 ships `apps/console` as an internal admin tool, not a user-facing product.

- The console is allowlisted by Telegram user id. Production must fail closed when `ALLOWED_USER_IDS` is empty.
- Agent output is treated as untrusted text and escaped before Telegram Markdown rendering.
- Read-only tools are allowed by default for diagnostics and summaries.
- Mutating tools require explicit human approval and must log the requested action, actor, target, and result.
- MCP configuration must start from a read-only policy. Write scopes are separate, narrow, and disabled unless an operator enables them for a specific task.
- Prompt files are versioned in git. Prompt changes go through PR review and must include the behavioral reason for the change.
- MCC or deterministic category rules take precedence over AI categorization. AI categorization can fill gaps or propose candidates, but it must not silently override deterministic rules.

## Consequences

Future console and OpenClaw PRs can point to one policy instead of reopening the architecture discussion. Expansion into more agents should first add tests, audit logging, and narrowly scoped tool permissions.
