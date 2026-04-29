## What changed

<!-- Brief description of the changes. -->

## Why

<!-- Motivation, linked issue, or context. -->

## How to test

<!-- Steps for a reviewer to verify correctness. -->

---

## Pre-flight (Hard Rule #13)

<!--
Before opening this PR you should have read the relevant governance.
Tick what applies; if a box is N/A, write "n/a" inline.
-->

- [ ] Read the `AGENTS.md` Hard Rules that apply to the touched paths.
- [ ] Read the matching playbook in `docs/playbooks/` (or noted that none exists).
- [ ] Checked freshness headers of docs cited in the change.

## Docs updated alongside code? (Hard Rule #13)

<!--
Documentation is part of the change set, not a follow-up. Tick what applies.
-->

- [ ] API contract change — `packages/api-client/**` types + contract test updated (Hard Rule #3).
- [ ] New / removed npm script — `CONTRIBUTING.md § Everyday Commands` and `CLAUDE.md § Quick commands` updated.
- [ ] New design token / component / palette — `docs/design/design-system.md` (and `BRANDBOOK.md` if branded) updated.
- [ ] Deprecation — `@deprecated` JSDoc with `@removeBy` added; consuming docs marked `> **Status:** Deprecated`.
- [ ] Freshness header bumped on docs whose claims changed (`> Last validated: YYYY-MM-DD by @owner`).
- [ ] N/A — no docs invalidated by this change.

## How AI-tested this PR

<!-- If this PR was created by an AI agent, describe what was verified. -->

- [ ] Manual smoke (which flow?): ...
- [ ] Vitest passes: ...
- [ ] No new `AI-DANGER` markers added without justification.
- [ ] Docs prose uses Ukrainian where practical, per `AGENTS.md`.
- [ ] `pnpm dead-code:files` clean (or new files marked `@scaffolded`).

## AGENTS.md updated?

- [ ] Yes — link to changed line(s)
- [ ] No — no new permanent rules
