# Architecture Decision Records (ADR)

> Архітектурні рішення Sergeant. Кожен ADR фіксує **рішення з контекстом і альтернативами**, щоб через рік не довелось гадати «чому ми тут зробили так, а не інакше».
>
> **Last reviewed: 2026-04-27 by @Skords-01.**

---

## Що таке ADR

ADR (Architecture Decision Record) — короткий документ, який фіксує **архітектурне рішення з контекстом і альтернативами**. ADR не описує how-to (це playbook) і не дублює широку специфікацію (це design doc). ADR відповідає на питання **«чому»**, не **«як»**.

Заводимо ADR коли рішення стосується архітектури, вибору технології, зовнішніх інтеграцій, або суттєво впливає на структуру коду / DX / operational процеси. Не заводимо для дрібних рефакторингів, bug-фіксів або стилістичних змін.

## Naming convention

```
docs/adr/
├── README.md                    ← ви тут
├── TEMPLATE.md                  ← шаблон для нових ADR
├── 0001-monetization-architecture.md
├── 0002-tool-lifecycle.md
└── NNNN-kebab-case-title.md
```

- Формат: `NNNN-kebab-case-title.md` — 4-значний sequential номер, без пропусків (`0001`, `0002`, ...).
- Для нового ADR: скопіюй [`TEMPLATE.md`](./TEMPLATE.md), перейменуй у `NNNN-kebab-case-title.md`, заповни секції.
- ADR ніколи не видаляються — лише `deprecated`.

## Lifecycle

```
Proposed → Accepted → (Deprecated | Superseded by ADR-XXXX)
```

| Статус                   | Коли                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| `Proposed`               | ADR створено, PR відкритий, рішення ще не затверджене.            |
| `Accepted`               | PR змерджено, рішення діє.                                        |
| `Deprecated`             | Рішення більше не актуальне (технологія відмовлена, тощо).        |
| `Superseded by ADR-NNNN` | Нове рішення замінює це; новий ADR лінкує `Supersedes: ADR-MMMM`. |

Зміна статусу — **окремим PR-ом** (щоб бачити чому і коли рішення було переглянуто).

## Як створити новий ADR

1. Скопіюй [`TEMPLATE.md`](./TEMPLATE.md), перейменуй у `NNNN-kebab-case-title.md` (інкрементуй номер).
2. Заповни секції: Context and Problem Statement / Considered Options / Decision / Rationale / Consequences / Compliance.
3. Status = `Proposed` поки PR не змерджений.
4. При мерджі — `Accepted` + дата.
5. Лінкуй ADR з відповідних дизайн-документів (`docs/launch/06-*`, `docs/audits/*`).
6. Додай рядок у таблицю «Поточні ADR» нижче.

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
