# ADR-0002: AI tool lifecycle (proposal → safety review → rollout → KPIs)

- **Status:** accepted
- **Date:** 2026-04-27
- **Reviewers:** @Skords-01
- **Supersedes:** —
- **Related:**
  - [`docs/audits/2026-04-26-sergeant-audit-devin.md`](../audits/2026-04-26-sergeant-audit-devin.md) — пункт `PR-12.D`.
  - [`apps/server/src/modules/chat/tools.ts`](../../apps/server/src/modules/chat/tools.ts) — реєстр Anthropic tools.
  - [`apps/server/src/modules/chat/toolMetrics.ts`](../../apps/server/src/modules/chat/toolMetrics.ts) — `chat_tool_invocations_total{tool, outcome}` (PR-12.C, [#924](https://github.com/Skords-01/Sergeant/pull/924)).
  - [`apps/web/src/core/lib/chatActions/`](../../apps/web/src/core/lib/chatActions/) — клієнтські handler-и tool-call-ів.
  - [`docs/playbooks/add-hubchat-tool.md`](../playbooks/add-hubchat-tool.md) — операційний how-to.
  - [`docs/playbooks/tune-system-prompt.md`](../playbooks/tune-system-prompt.md).

---

## 0. TL;DR

Кожен Anthropic tool у Sergeant проходить **4 фази** з explicit gate-ами: **Proposal → Safety review → Rollout → KPI-evaluation**. Без цього процесу tools накопичуються асиметрично — модель має 30+ tools, з яких 8 ніколи не викликається, а 3 крашать клієнт без алерту. Метрика `chat_tool_invocations_total{tool, outcome=proposed|executed|unknown_tool}` (з PR-12.C) є джерелом істини для KPI-фази.

| Фаза        | Тривалість            | Gate (хто/що)                                                       | Артефакт              |
| ----------- | --------------------- | ------------------------------------------------------------------- | --------------------- |
| 1. Proposal | 1-3 дні               | RFC-issue з motivation + draft tool-spec                            | GitHub Issue          |
| 2. Safety   | 1-2 дні               | Owner + checklist (idempotency, RLS, rate-limit, AI-DANGER markers) | PR review checkboxes  |
| 3. Rollout  | 1 спринт (~1 тиждень) | PR + flag (`AI_TOOL_<NAME>_ENABLED=1`) + контракт-тести             | Merged PR             |
| 4. KPIs     | 30 днів post-merge    | Прометей + дашборд `proposed - executed` + retention                | Recurring review note |

Кожна фаза має criteria-вихід; невідповідність на будь-якому gate-і — повернення на попередню фазу або **deprecation** (видалення з реєстру + cleanup metrics).

---

## ADR-2.1 — Чому потрібен формальний lifecycle

### Status

accepted.

### Context

Станом на 2026-04-26 в Anthropic-реєстрі (`apps/server/src/modules/chat/tools.ts`) — **40+ tools**, поділених між finyk, fizruk, nutrition, routine, hub-доменами. Проблеми, які ми реально спостерігали:

1. **Silent dead tools.** Деякі tools, додані ще у MVP-фазі (приклад: `analyze_workout_form`), модель пропонує менше ніж 1 раз/тиждень, бо в SYSTEM_PREFIX немає інструкцій, коли їх викликати. Метрика `chat_tool_invocations_total{outcome=proposed}` для них ≈ 0 — токени на schema-decoding витрачаються, value = 0.
2. **Crashes без алертів.** Коли клієнтський handler у `apps/web/src/core/lib/chatActions/*` падає (наприклад, schema-drift), модель отримує помилку у `tool_result`, генерує "Спробуй пізніше" і чат продовжується. Sentry мовчить, юзер бачить деградований UX. Без `executed`-метрики та контракт-тестів handler-ів (PR-12.B, [#885](https://github.com/Skords-01/Sergeant/pull/885)) такі регресії живуть тижнями.
3. **Race-conditions.** Клієнт reload → state mismatch → `tool_result.tool_use_id`, який сервер вже не пам'ятає. До PR-12.C ми це не міряли; тепер це `outcome=unknown_tool`.
4. **No safety review.** Tools, що мутують дані (`delete_transaction`, `move_funds`, `start_workout`), не мали checklist-у на idempotency / rate-limit / RLS. Один баг ([#788](https://github.com/Skords-01/Sergeant/issues/788), наразі закритий) дозволяв одному юзеру через model hallucination видалити чужу транзакцію — RLS-policy лагодилась реактивно.
5. **Cost asymmetry.** Tools з великим `input_schema` коштують token-budget на кожному виклику моделі (вони включені в context). Tool, що проектує 200 токенів, але executes 0.1×/день — net negative.

### Decision

Кожен tool проходить **4 фази** з визначеними gate-ами. ADR описує tool lifecycle на рівні організаційного процесу, не коду — конкретна імплементація (PR template, GitHub Issue template, dashboard) — окремими follow-up-PR-ами.

### Consequences

**Позитивні:**

- Видимий audit-trail кожного tool-у (хто запропонував, хто прорев'юив safety, які KPI намірили).
- Об'єктивне deprecation-рішення: `proposed < 5/тиждень AND executed_rate < 80%` за 30 днів = кандидат на видалення.
- Cost-discipline: проєкція token-budget на нові tools у Proposal-фазі, перевірка реального consumption у KPI-фазі.

**Негативні:**

- Додатковий процесний overhead на новий tool (≈1-3 дні на Proposal + Safety review до коду).
- Потрібен dashboard у Grafana (PR-8.B, не закритий); до того часу KPI-фаза = ручний `curl /metrics` + spreadsheet.

### Alternatives considered

1. **No formal lifecycle.** Дешевше, але саме звідси виросли всі 5 проблем у Context. Відкинуто.
2. **Per-PR review without ADR.** Кожен tool-PR проходить ad-hoc review без чек-листа. Вже так працювало 6 місяців — призвело до тих самих проблем (#788). Відкинуто.
3. **Quarterly tool audit замість per-tool lifecycle.** Дешевше у proposal-фазі, але reactive — баг живе до наступного аудиту. Відкинуто, частково перекривається KPI-фазою тут.

---

## ADR-2.2 — Фаза 1: Proposal

### Status

accepted.

### Process

1. Автор створює GitHub Issue з лейблом `tool-proposal` + наступний template (треба в наступному PR покласти у `.github/ISSUE_TEMPLATE/tool-proposal.md`):

   ```markdown
   ## Motivation

   <!-- Який юзер-flow потребує цей tool? Які дані модель не може дістати без нього? -->

   ## Tool spec (draft)

   - **name:** `<snake_case_name>`
   - **scope:** `finyk` | `fizruk` | `nutrition` | `routine` | `hub`
   - **mutation?** yes | no
   - **input_schema:** <YAML / TS>
   - **expected output:** <string up to N chars / structured JSON>

   ## Estimated KPIs (30-day forecast)

   - **proposed-events/week:** <число> (як часто модель буде це викликати)
   - **executed_rate:** <%> (зазвичай 90%+; нижче — flag для safety-фази)
   - **token-budget impact:** <±N токенів на context-load>

   ## Alternatives considered

   <!-- Чому не `existing_tool_X` + post-processing? Чому не SYSTEM_PREFIX-інструкція? -->
   ```

2. Owner-домену (см. ADR-2.6) ставить `approved: proposal` лейбл або повертає на доопрацювання.
3. Без approved-issue PR з кодом нового tool-у НЕ відкривається. Якщо це bug-fix існуючого tool-у — фаза 1 пропускається.

### Exit criteria

- Issue має filled motivation, tool-spec, KPI-forecast, alternatives.
- Owner поставив approved: proposal лейбл.

---

## ADR-2.3 — Фаза 2: Safety review

### Status

accepted.

### Process

PR з кодом нового tool-у (`apps/server/src/modules/chat/toolDefs/<scope>.ts` + клієнтський handler у `apps/web/src/core/lib/chatActions/`) має у body наступний checklist (треба в наступному PR покласти у `.github/PULL_REQUEST_TEMPLATE/tool.md`):

```markdown
## Safety review checklist (PR-12.D ADR-2.3)

### Mutation safety

- [ ] Mutation? <yes/no>
- [ ] Якщо yes — handler **idempotent** (повторний виклик з тим самим input не дублює запис).
- [ ] Якщо yes — `requireAiQuota` middleware застосовано (вартість = 1 quota-unit).

### RLS / authorization

- [ ] Handler перевіряє ownership перед мутацією (`req.user.id === resource.user_id` або RLS-policy на DB-рівні).
- [ ] Якщо tool читає дані — додано до `apps/server/src/lib/rls.ts` snapshot-test.

### Rate limiting

- [ ] Глобальний `aiQuota` middleware застосовано.
- [ ] Tool-specific rate limit (наприклад, `barcode-scan` — max 10/min) — якщо потрібно.

### Schema validation

- [ ] `input_schema` має жорсткі межі (`.max()` для рядків, `.int()` для чисел).
- [ ] Output (text/JSON) має cap (наприклад, `≤ 8000 chars` — див. ToolResult schema).

### Observability

- [ ] Tool name додано до whitelist у `apps/server/src/modules/chat/toolMetrics.ts:KNOWN_TOOL_NAMES` (через `TOOLS`-реєстр — авто-маперинг).
- [ ] Sentry breadcrumb на error-path handler-у (`apps/web/src/core/lib/chatActions/*`).
- [ ] Контракт-тест handler-у — happy + error path (рул #3 з AGENTS.md, плюс PR-12.B).

### Markers

- [ ] AI-DANGER marker на handler-функції, якщо вона мутує дані.
- [ ] Inline comment пояснює, чому tool необхідний (не просто wrap над існуючим API).
```

Owner-домену відмічає чекбокси у review або вимагає змін. Без зеленого checklist-а PR не мерджиться.

### Exit criteria

- Усі чекбокси відмічені.
- CI зелений (vitest + контракт-тест handler-у + lint).

---

## ADR-2.4 — Фаза 3: Rollout

### Status

accepted.

### Process

1. **Feature flag**: новий tool додається у реєстр під ENV-flag-ом `AI_TOOL_<UPPER_NAME>_ENABLED` (наприклад, `AI_TOOL_DELETE_TRANSACTION_ENABLED=1`). Default — `0`.
2. **Staging rollout**: у Railway staging-environment ENV вмикаємо. На production — вимкнено.
3. **Manual smoke**: автор PR-у робить 5 chat-діалогів у staging, які мають викликати новий tool. Скрін у PR.
4. **Production enable**: окремий 1-line PR, що вмикає `AI_TOOL_<NAME>_ENABLED=1` у production environment-config-у. Цей PR — ще один gate (peer review без коду).
5. **Rollback план**: вимкнення flag-у — instant rollback (без redeploy). Документується у PR description.

Виняток: tools, що міграції/breaking changes у `tools.ts` не вимагають (наприклад, bug-fix у handler-і) — фаза 3 збігається з PR-merge.

### Exit criteria

- Flag увімкнений у production принаймні **24 години** без алертів у Sentry.
- Перші 10 `chat_tool_invocations_total{outcome=executed}` без crash-у.

---

## ADR-2.5 — Фаза 4: KPIs / evaluation

### Status

accepted.

### Process

**30 днів** після production-rollout автор tool-у відкриває recurring-issue з лейблом `tool-kpi-review` і замикає метрики:

| Метрика                                       | Threshold                  | Дія, якщо не пройшло                                   |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `proposed`-events/week (за останні 4 тижні)   | ≥ forecast із Proposal × ½ | Поправити SYSTEM_PREFIX або deprecate                  |
| `executed_rate` = `executed / proposed`       | ≥ 80%                      | Investigate handler-failures у Sentry, стабілізувати   |
| `unknown_tool`-events/тиждень                 | ≤ 5                        | Bug-fix у клієнтський state-management, race condition |
| `chat_tool_result_truncated_total{tool}`-rate | ≤ 10% від `executed`       | Reduce output size або винести у окремий endpoint      |
| Sentry-error-rate handler-у                   | ≤ 1% від `executed`        | Bug-fix; якщо chronic — escalate до safety-фази заново |

Якщо tool **2 рази підряд** (60 днів) не проходить пороги — формальний deprecation-PR:

1. Прибрати з `TOOLS`-реєстру.
2. Прибрати з `KNOWN_TOOL_NAMES` whitelist (PR-12.C).
3. Видалити клієнтський handler.
4. Сnapshot тестів — оновити.
5. Issue-link на оригінальний proposal-issue з explicit "deprecated, see ADR-0002 KPI fail".

### Exit criteria

- KPI-issue заповнена і closed-as-keep або closed-as-deprecated.

---

## ADR-2.6 — Owner-domain map

### Status

accepted.

### Decision

| Domain               | Owner      | Tools (приклади)                                              |
| -------------------- | ---------- | ------------------------------------------------------------- |
| `finyk`              | @Skords-01 | `delete_transaction`, `categorize_transactions`, `move_funds` |
| `fizruk`             | @Skords-01 | `start_workout`, `log_set`, `recommend_recovery`              |
| `nutrition`          | @Skords-01 | `log_meal`, `query_food_db`                                   |
| `routine`            | @Skords-01 | `mark_habit_done`, `query_streak`                             |
| `hub` (cross-domain) | @Skords-01 | `get_briefing`, `summarize_period`                            |

(Single-owner repo; коли команда росте — owners-секцію оновити.)

### Exit criteria

n/a (operational map, не gate).

---

## ADR-2.7 — Зв'язок з Anthropic prompt cache і budget

### Status

accepted.

### Decision

`tools` array кешується через Anthropic prompt-caching (`cache_control: ephemeral`, PR-12.A, [#864](https://github.com/Skords-01/Sergeant/pull/864)). Це означає:

- Додавання нового tool **інвалідує cache** на наступні 5 хвилин (TTL Anthropic-кешу) — короткий cost-spike.
- Видалення tool теж інвалідує cache — врахувати при batch-deprecation.
- Якщо planується додати **N tools одразу**, краще зробити це одним PR (один cache-miss), ніж N окремих (N cache-misses).

Метрика `anthropic_prompt_cache_hit_total{version, outcome=hit|miss}` (PR-12.A) допомагає валідувати, що cache справді гріє після rollout.

### Exit criteria

n/a (operational reference).

---

## ADR-2.8 — Не-цілі (out of scope)

Цей ADR **не** покриває:

- **Tool authoring style** (іменування, opinionated input shapes) — це operational guidance у `docs/playbooks/add-hubchat-tool.md`.
- **System prompt tuning** — окремий playbook `docs/playbooks/tune-system-prompt.md`.
- **Anthropic version bumps / model selection** — закрито у [ADR-0005](./0005-anthropic-model-selection-and-prompt-caching.md) (`claude-sonnet-4-6` як єдиний tier; cache breakpoint policy; `SYSTEM_PROMPT_VERSION`-bump-rule).
- **Quotas і monetization gating** — ADR-0001 + `requireAiQuota` middleware.
- **Безпека ширше за tool boundary** (XSS, CSRF, secrets management) — repo-wide AGENTS.md hard rules.

---

## Open questions

1. **Tool deprecation: hard-delete чи tombstone?** Зараз пропонується hard-delete з `TOOLS`. Альтернатива: лишати у whitelist з `outcome=deprecated` міткою — щоб старі metric-series не зникали миттєво. Вирішується у PR-12.C follow-up.
2. **Cross-tool dependency.** Наприклад, `start_workout` залежить від `get_active_workout_session`. Чи потрібен явний DAG у tool spec? Поки — описувати у `motivation`-секції issue, але якщо таких випадків стане > 5, повертаємось до питання.
3. **A/B testing нового tool.** Поки що усі юзери одразу отримують tool після rollout. Альтернатива — feature-flag на 50% і порівняти `executed_rate` між cohort-ами. Вирішується після інтеграції feature-flag-сервіс (поки немає).
