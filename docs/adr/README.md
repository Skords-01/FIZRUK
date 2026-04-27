# Architecture Decision Records (ADR)

> Архітектурні рішення Sergeant. Кожен ADR — одне рішення, одна сторінка, з контекстом, обраним варіантом і альтернативами.

## Що таке ADR

ADR (Architecture Decision Record) — короткий документ, який фіксує **архітектурне рішення з контекстом і альтернативами**, щоб через рік не довелось гадати «чому ми тут зробили так, а не інакше».

Кожен ADR має:

- **Status** — `proposed` / `accepted` / `superseded by ADR-NNNN` / `deprecated`.
- **Context** — що ми вирішуємо і чому це питання взагалі виникло.
- **Decision** — який варіант ми обрали.
- **Consequences** — що з цього випливає (як добрі, так і погані).
- **Alternatives considered** — інші варіанти, чому не вони.

## Конвенції файлів

```
docs/adr/
├── README.md                    ← ви тут
├── 0001-monetization-architecture.md
├── 0002-...
└── NNNN-<short-kebab-title>.md
```

- Номери послідовні, без пропусків (`0001`, `0002`, ...).
- Якщо ADR замінює попередній — старий помічається `superseded by ADR-NNNN`, новий лінкує `supersedes ADR-MMMM`.
- ADR ніколи не видаляються — лише `deprecated`.

## Як створити новий ADR

1. Скопіюй останній ADR як шаблон, інкрементуй номер.
2. Заповни секції Status / Context / Decision / Consequences / Alternatives.
3. Status = `proposed` поки PR не змерджений.
4. При мерджі — `accepted` + дата.
5. Лінкуй ADR з відповідних дизайн-документів (`docs/launch/06-*`, `docs/audits/*`).

## Поточні ADR

| #    | Назва                                      | Статус   | Створено   | Контекст                                                                                                  |
| ---- | ------------------------------------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| 0001 | Monetization architecture                  | proposed | 2026-04-27 | 11 рішень перед стартом monetization-MVP (provider, cache, trial, tax, cancel, ...)                       |
| 0002 | AI tool lifecycle                          | accepted | 2026-04-27 | 4-фазний процес для Anthropic tools: Proposal → Safety → Rollout → KPIs.                                  |
| 0003 | Refund and dispute handling                | proposed | 2026-04-27 | Закриває ADR-1.11 open question — manual refunds via Stripe Dashboard + dispute auto-deactivation.        |
| 0004 | CloudSync — LWW conflict resolution        | accepted | 2026-04-27 | Per-module LWW з `client_updated_at` guard для 16-файлового sync engine у `apps/web/src/core/cloudSync/`. |
| 0005 | Anthropic model selection + prompt caching | accepted | 2026-04-27 | Закриває ADR-2.8 TBD — `claude-sonnet-4-6` як єдиний tier; cache breakpoint policy.                       |
| 0006 | User deletion and PII handling             | proposed | 2026-04-27 | GDPR Art. 15/17 — soft-delete + 30d hard-delete cron + external-services cleanup queue.                   |
| 0007 | Better Auth choice and session model       | accepted | 2026-04-27 | Чому Better Auth, dual-channel cookie+bearer, 30d session з 5min cookie cache.                            |
| 0008 | API versioning policy (`/api/v1`)          | accepted | 2026-04-27 | URL-prefix versioning, single router з rewrite middleware, sunset criteria для `/api/*`.                  |
