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

| #    | Назва                              | Статус   | Створено   | Контекст                                                                                                     |
| ---- | ---------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| 0001 | Monetization architecture          | proposed | 2026-04-27 | 11 рішень перед стартом monetization-MVP (provider, cache, trial, tax, cancel, ...)                          |
| 0002 | AI tool lifecycle                  | accepted | 2026-04-27 | 4-фазний процес для Anthropic tools: Proposal → Safety → Rollout → KPIs.                                     |
| 0003 | _(reserved — refund flow, TBD)_    | —        | —          | Зарезервовано під monetization (див. ADR-0001 §1).                                                           |
| 0004 | _(reserved — family plans, TBD)_   | —        | —          | Зарезервовано під monetization (див. ADR-0001 §1).                                                           |
| 0005 | _(reserved — referral codes, TBD)_ | —        | —          | Зарезервовано під monetization (див. ADR-0001 §1).                                                           |
| 0006 | RQ keys factory                    | accepted | 2026-04-27 | Централізовані `queryKeys.ts` факторії, ESLint-rule `rq-keys-only-from-factory`, hashing секретів.           |
| 0007 | Tailwind opacity / `-strong` tier  | accepted | 2026-04-27 | Зареєстрована opacity-шкала + `-strong` companion-кольори для WCAG-AA на solid-fills.                        |
| 0008 | Feature flags                      | accepted | 2026-04-27 | Client-only registry над `typedStore` (LS-backed, sync між табами), `experimental` лайфцикл.                 |
| 0009 | Push notifications                 | accepted | 2026-04-27 | `sendToUser` як єдина точка fan-out на web/APNs/FCM; circuit-breaker; `PushPayload` контракт.                |
| 0010 | Testing pyramid                    | accepted | 2026-04-27 | 5 шарів (unit / component+MSW / integration+Testcontainers / a11y / smoke-e2e), per-package coverage floors. |
| 0011 | Memory Bank                        | accepted | 2026-04-27 | Local-first user-fact store у `localStorage[USER_PROFILE]`; injection у HubChat system-prompt.               |
| 0012 | Atomic SQL daily quotas            | accepted | 2026-04-27 | `INSERT … ON CONFLICT DO UPDATE WHERE` для AI-квоти; bucket-и `default`/`tool:*`; refund-on-fail.            |
