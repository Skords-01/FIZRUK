# Architecture Decision Records (ADR)

> Архітектурні рішення Sergeant. Кожен ADR фіксує **рішення з контекстом і альтернативами**, щоб через рік не довелось гадати «чому ми тут зробили так, а не інакше».
>
> **Last reviewed: 2026-04-27 by @Skords-01.**

---

## Що таке ADR

ADR (Architecture Decision Record) — короткий документ, який фіксує **архітектурне рішення з контекстом і альтернативами**. ADR не описує how-to (це playbook) і не дублює широку специфікацію (це design doc). ADR відповідає на питання **«чому»**, не **«як»**.

Кожен ADR має:

- **Status** — `proposed` / `accepted` / `superseded by ADR-NNNN` / `withdrawn` / `deprecated`.
- **Date / Last reviewed** — коли прийнято і коли востаннє переглядали.
- **Context** — що ми вирішуємо і чому це питання взагалі виникло.
- **Decision** — який варіант ми обрали.
- **Consequences** — що з цього випливає (як добрі, так і погані).
- **Alternatives considered** — інші варіанти, чому не вони.

### Status enum

| Status                   | Коли використовуємо                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `proposed`               | Запропоновано, але PR-ADR ще не змерджено. Команда може коментувати і вимагати змін.                                      |
| `accepted`               | Змерджено, рішення в силі.                                                                                                |
| `superseded by ADR-NNNN` | Замінено новішим ADR. Файл лишається, але всі читачі повинні дивитись на новий.                                           |
| `withdrawn`              | ADR ніколи не дійшов до `accepted` (відкликаний автором, відсутній context, передумали). Залишається як історія розгляду. |
| `deprecated`             | Раніше був `accepted`, потім **скасований без заміни** (рішення відмінено, нове ADR не потрібне).                         |

`withdrawn` ≠ `deprecated`: перший — «не змерджено», другий — «змерджено, потім скасовано».

---

## ADR vs playbook vs design doc — межа

Три різні жанри документації, легко плутати:

| Жанр                                                  | Відповідає на            | Приклад                                                                                                |
| ----------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| **ADR** (`docs/adr/NNNN-*.md`)                        | «Чому?»                  | `0001-monetization-architecture.md` — чому Stripe, а не LiqPay; чому single-row, а не event log.       |
| **Playbook** (`docs/playbooks/`)                      | «Як зробити X?»          | `add-hubchat-tool.md` — покрокова інструкція додавання нового AI-tool-у.                               |
| **Design doc** (`docs/launch/`, `docs/architecture/`) | «Як це працює в цілому?» | `docs/launch/06-monetization-architecture.md` — schema, PR-розбивка, risk register monetization-епіку. |

**Як обирати.** Якщо текст можна почати зі слів «ми обрали X замість Y, тому що…» — це ADR. Якщо «open the file, run the command…» — playbook. Якщо «ось як весь епік виглядає від А до Я» — design doc.

ADR і design doc можуть співіснувати про одну тему: `0001-monetization-architecture.md` (decision-rationale) + `docs/launch/06-monetization-architecture.md` (schema + PR-tracker). Не дублюємо контент — лінкуємо.

---

## Compound vs atomic ADR

ADR може містити **одне рішення** або бути **compound** — об'єднувати декілька зв'язаних рішень одного епіку (як `0001` — 11 sub-decisions, як `0002` — 8 sub-decisions). Compound допустимий, **якщо**:

1. Усі sub-decisions належать одному епіку (monetization, AI tools, refund flow).
2. Кожен sub-decision має окрему пронумеровану секцію `## ADR-N.M` зі своїм Status / Context / Decision / Consequences / Alternatives.
3. У TL;DR-таблиці на початку видно всі sub-decisions з one-liner-ами.

Дрібні sub-ADR-и доповнюємо в той самий compound-файл (а не плодимо `0010a-*.md`). Якщо рішення не належить одному з існуючих епіків — пишемо новий ADR-файл.

---

## Конвенції файлів

```
docs/adr/
├── README.md                    ← ви тут
├── 0000-template.md             ← скопіюй це для нового ADR
├── 0001-monetization-architecture.md
├── 0002-tool-lifecycle.md
└── NNNN-<short-kebab-title>.md
```

- Номери послідовні, без пропусків (`0001`, `0002`, ...).
- Якщо ADR замінює попередній — старий помічається `superseded by ADR-NNNN`, новий лінкує `supersedes ADR-MMMM`.
- ADR ніколи не видаляються — лише `superseded` / `deprecated` / `withdrawn`.
- Кожен ADR має рядок `Last reviewed: YYYY-MM-DD by @owner` (мінімум — раз на квартал, або при будь-якій substantial зміні).

### Мова

- Основна — **українська** (проза, мотивація, наслідки).
- **Англійською:** заголовки status-ів (`accepted`, `proposed`, …), імена технологій, code blocks (TS / SQL / shell), назви метрик (`chat_tool_invocations_total`).
- Це впливає на grep-ability у tooling-у (Sentry, Grafana, GitHub search), тому міксований стиль — навмисний, а не недбалий.

---

## Як створити новий ADR

1. **Скопіюй** `0000-template.md` як `NNNN-<kebab-title>.md`, де `NNNN` — наступний вільний номер.
2. **Заповни** Status / Context / Decision / Consequences / Alternatives. Status = `proposed` поки PR не змерджений.
3. **Додай у таблицю** «Поточні ADR» нижче — рядок з номером, назвою, статусом, датою.
4. **Лінкуй** ADR з відповідних дизайн-документів (`docs/launch/06-*`, `docs/audits/*`) і з коду (`apps/server/src/...`).
5. **Review.** На solo-репо — `@Skords-01` + sleep-on-it 24h перед merge. На зростання команди (≥2 контриб'ютори в зоні рішення) — додатковий approver від відповідного `owner-domain` (див. ADR-0002 §2.6).
6. При мерджі — `accepted` + `Last reviewed` дата.
7. Якщо ADR змінює існуючий — supersedes / replaces secter попередній і лінкує його.

---

## Поточні ADR

| #    | Назва                                 | Статус   | Створено   | Last reviewed | Контекст                                                                                                    |
| ---- | ------------------------------------- | -------- | ---------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| 0001 | Monetization architecture             | proposed | 2026-04-27 | 2026-04-27    | 16 рішень перед стартом monetization-MVP (provider, cache, trial, dunning, proration, tax, observability…). |
| 0002 | AI tool lifecycle                     | accepted | 2026-04-27 | 2026-04-27    | 4-фазний процес для Anthropic tools + schema-versioning + hot kill-switch + token-budget cap.               |
| 0003 | Refund and dispute handling           | proposed | 2026-04-27 | 2026-04-27    | Закриває open question з ADR-1.11. Refund-flow, charge-disputes, customer-credit-balance.                   |
| 0004 | Account deletion and PII handling     | proposed | 2026-04-27 | 2026-04-27    | UA Закон про захист персональних даних + GDPR-подібний flow для майбутніх ринків. Cross-system cleanup.     |
| 0005 | Anthropic model selection and caching | proposed | 2026-04-27 | 2026-04-27    | Закриває TBD-ADR з ADR-2.8. Який модель пiнімо, як апгрейдимо, як вимірюємо ROI prompt-cache.               |

---

## Заплановані ADR (backlog)

Список рішень, які варто задокументувати, але ще не написано. Pull-request-и з закриттям пунктів — welcome.

| #        | Тема                                                                                   | Owner      | Пріоритет |
| -------- | -------------------------------------------------------------------------------------- | ---------- | --------- |
| ADR-0006 | Better Auth choice and session model                                                   | @Skords-01 | P1        |
| ADR-0007 | API versioning policy (`/api/v1/*`) — bump-criteria і backwards-compat вікно           | @Skords-01 | P1        |
| ADR-0008 | CloudSync architecture: LWW conflict resolution, offline queue, dirty-modules          | @Skords-01 | P1        |
| ADR-0009 | Hosting split: Railway (server + DB) + Vercel (SPA)                                    | @Skords-01 | P2        |
| ADR-0010 | Mobile dual-track: `mobile-shell` (Capacitor) + `mobile` (native Expo) + sunset        | @Skords-01 | P2        |
| ADR-0011 | Local-first storage: MMKV (mobile) + localStorage→TypedStore (web)                     | @Skords-01 | P2        |
| ADR-0012 | Postgres RLS as primary authorization boundary                                         | @Skords-01 | P2        |
| ADR-0013 | DB migrations conventions (sequential, two-phase DROP, no auto-tooling)                | @Skords-01 | P2        |
| ADR-0014 | bigint→number coercion + JSON serialization policy                                     | @Skords-01 | P2        |
| ADR-0015 | Observability stack: Sentry + Pino + Prometheus                                        | @Skords-01 | P2        |
| ADR-0016 | RQ queryKeys factory architecture                                                      | @Skords-01 | P3        |
| ADR-0017 | Design tokens & a11y enforcement (Tailwind opacity scale + brand `-strong` companions) | @Skords-01 | P3        |
| ADR-0018 | Feature flag system (env-based, no third-party)                                        | @Skords-01 | P3        |
| ADR-0019 | Push notifications: web-push + Expo (APNs/FCM)                                         | @Skords-01 | P3        |
| ADR-0020 | Testing pyramid: Vitest + MSW + Testcontainers + Playwright + Detox                    | @Skords-01 | P3        |
| ADR-0021 | AI Memory Bank — storage, access, lifecycle                                            | @Skords-01 | P3        |
| ADR-0022 | Rate limiting / atomic SQL quotas                                                      | @Skords-01 | P3        |

P1 — варто додати найближчим часом (закриває launch-blocker або поточний gap).
P2 — стратегічні рішення, варто задокументувати, але не блокує.
P3 — operational, можна fold-нути в інші ADR-и або написати при першому конфлікті.
