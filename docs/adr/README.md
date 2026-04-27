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

- Номери послідовні (`0001`, `0002`, ...). Пропуски допустимі лише коли номер
  явно **зарезервований** під майбутній ADR, запланований у списку `Open
questions` іншого ADR (див. ADR-0001 → ADR-0003...0008 зарезервовані).
- Якщо ADR замінює попередній — старий помічається `superseded by ADR-NNNN`, новий лінкує `supersedes ADR-MMMM`.
- ADR ніколи не видаляються — лише `deprecated`.

## Як створити новий ADR

1. Скопіюй останній ADR як шаблон, інкрементуй номер.
2. Заповни секції Status / Context / Decision / Consequences / Alternatives.
3. Status = `proposed` поки PR не змерджений.
4. При мерджі — `accepted` + дата.
5. Лінкуй ADR з відповідних дизайн-документів (`docs/launch/06-*`, `docs/audits/*`).

## Поточні ADR

| #    | Назва                              | Статус   | Створено   | Контекст                                                                              |
| ---- | ---------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------- |
| 0001 | Monetization architecture          | proposed | 2026-04-27 | 11 рішень перед стартом monetization-MVP (provider, cache, trial, tax, cancel, ...)   |
| 0002 | AI tool lifecycle                  | accepted | 2026-04-27 | 4-фазний процес для Anthropic tools: Proposal → Safety → Rollout → KPIs.              |
| 0009 | Hosting split Railway + Vercel     | accepted | 2026-04-27 | API + Postgres на Railway, web + edge-proxy на Vercel; single-origin cookie boundary. |
| 0010 | Mobile dual-track (Capacitor+Expo) | accepted | 2026-04-27 | Shell + RN паралельно, окремі bundle-ID, спільний API та domain-пакети.               |
| 0011 | Local-first storage                | accepted | 2026-04-27 | Клієнт — primary, сервер — LWW-реплікатор на module-рівні; offline queue.             |
| 0012 | RLS as authz boundary              | proposed | 2026-04-27 | Цільова модель RLS + `withUserContext`; поточно — app-enforced `WHERE user_id`.       |
| 0013 | DB migrations conventions          | accepted | 2026-04-27 | Sequential `NNN_*.sql`, forward-only, two-phase DROP, idempotent, tests first.        |
| 0014 | bigint → number policy             | accepted | 2026-04-27 | Серіалізатори коерсять `BIGINT` → JS `number`; snapshot-тести лочать contract.        |
| 0015 | Observability stack                | accepted | 2026-04-27 | Pino (logs) + Prometheus (metrics) + Sentry (errors); SLO-first burn-rate alerts.     |

> Номери 0003–0008 — зарезервовані під ADR, що обговорюються як `Open questions` у ADR-0001 (refund/dispute, family/team plans, promo/referral, multi-instance plan-cache eviction). Ще не створені — виходять за рамки Phase 1.
