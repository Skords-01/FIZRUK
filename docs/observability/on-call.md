# On-Call Guide

> Last reviewed: 2026-04-27.

Операційний документ для on-call інженера. Зібрано з [SLO.md](./SLO.md),
[runbook.md](./runbook.md), [alert_rules.yml](./prometheus/alert_rules.yml),
[AGENTS.md](../../AGENTS.md) та [railway-vercel.md](../integrations/railway-vercel.md).

---

## 1. Severity levels

| Severity | SLA реакції                | Дія                                      |
| -------- | -------------------------- | ---------------------------------------- |
| `page`   | **15 хв** з моменту алерту | Негайне розслідування. Будити on-call.   |
| `ticket` | **Наступний бізнес-день**  | Створити issue, дослідити в робочий час. |

### Повний список алертів

| #   | Alert                             | Severity | SLO / домен               | Runbook                                                                            |
| --- | --------------------------------- | -------- | ------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `HttpErrorBudgetBurnFast`         | page     | HTTP API 99.0 %           | [runbook § HttpErrorBudgetBurn](./runbook.md#httperrorbudgetburn)                  |
| 2   | `HttpErrorBudgetBurnSlow`         | ticket   | HTTP API 99.0 %           | [runbook § HttpErrorBudgetBurn](./runbook.md#httperrorbudgetburn)                  |
| 3   | `HttpLatencyP95High`              | ticket   | HTTP latency p95 < 1 s    | [runbook § HttpLatencyP95High](./runbook.md#httplatencyp95high)                    |
| 4   | `SyncErrorBudgetBurnFast`         | page     | Sync 99.5 %               | [runbook § SyncErrorBudgetBurn](./runbook.md#syncerrorbudgetburn)                  |
| 5   | `SyncErrorBudgetBurnSlow`         | ticket   | Sync 99.5 %               | [runbook § SyncErrorBudgetBurn](./runbook.md#syncerrorbudgetburn)                  |
| 6   | `SyncLatencyP95High`              | ticket   | Sync latency p95 < 2.5 s  | [runbook § SyncLatencyP95High](./runbook.md#synclatencyp95high)                    |
| 7   | `SyncConflictSpike`               | ticket   | Sync (не SLO)             | [runbook § SyncConflictSpike](./runbook.md#syncconflictspike)                      |
| 8   | `AuthErrorBudgetBurnFast`         | page     | Auth 99.0 %               | [runbook § AuthErrorBudgetBurn](./runbook.md#autherrorbudgetburn)                  |
| 9   | `AuthErrorBudgetBurnSlow`         | ticket   | Auth 99.0 %               | [runbook § AuthErrorBudgetBurn](./runbook.md#autherrorbudgetburn)                  |
| 10  | `AuthSessionLookupSlow`           | ticket   | Auth latency p95 < 100 ms | [runbook § AuthSessionLookupSlow](./runbook.md#authsessionlookupslow)              |
| 11  | `AuthRateLimitSpike`              | ticket   | Auth (не SLO)             | [runbook § AuthRateLimitSpike](./runbook.md#authratelimitspike)                    |
| 12  | `AiErrorBudgetBurnFast`           | page     | AI 97.0 %                 | [runbook § AiErrorBudgetBurn](./runbook.md#aierrorbudgetburn)                      |
| 13  | `AiErrorBudgetBurnSlow`           | ticket   | AI 97.0 %                 | [runbook § AiErrorBudgetBurn](./runbook.md#aierrorbudgetburn)                      |
| 14  | `AiLatencyP95High`                | ticket   | AI latency p95 < 30 s     | [runbook § AiLatencyP95High](./runbook.md#ailatencyp95high)                        |
| 15  | `AiQuotaStoreDown`                | ticket   | AI quota (фін. ризик)     | [runbook § AiQuotaStoreDown](./runbook.md#aiquotastoredown)                        |
| 16  | `ExternalHttpErrorBudgetBurnSlow` | ticket   | External HTTP 95.0 %      | [runbook § ExternalHttpErrorBudgetBurn](./runbook.md#externalhttperrorbudgetburn)  |
| 17  | `UnhandledRejectionObserved`      | page     | Process                   | [runbook § UnhandledRejection](./runbook.md#unhandledrejection--uncaughtexception) |
| 18  | `UncaughtExceptionObserved`       | page     | Process                   | [runbook § UncaughtException](./runbook.md#unhandledrejection--uncaughtexception)  |
| 19  | `DbPoolWaitingSustained`          | ticket   | DB pool (leading)         | [runbook § DbPoolWaitingSustained](./runbook.md#dbpoolwaitingsustained)            |
| 20  | `DbPoolSaturated`                 | page     | DB pool                   | [runbook § DbPoolSaturated](./runbook.md#dbpoolsaturated)                          |
| 21  | `ProgrammerErrorsIncreasing`      | ticket   | App errors                | [runbook § ProgrammerErrors](./runbook.md#programmererrors)                        |

Визначення алертів: [`prometheus/alert_rules.yml`](./prometheus/alert_rules.yml).

---

## 2. Routing

`alertmanager.yml` наразі **не присутній у репо** — налаштовується на стороні інфраструктури.

**Очікуваний сетап Alertmanager:**

| Severity | Receiver                               | Канал                                                            |
| -------- | -------------------------------------- | ---------------------------------------------------------------- |
| `page`   | `pagerduty-oncall` / `telegram-oncall` | PagerDuty webhook → on-call rotation; Telegram bot у on-call чат |
| `ticket` | `email-team` / `sentry-tickets`        | Email на команду; Sentry створює issue автоматично               |

```yaml
# alertmanager.yml (очікуваний)
route:
  receiver: email-team
  group_by: [alertname, slo]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: page
      receiver: pagerduty-oncall
      continue: true
    - match:
        severity: page
      receiver: telegram-oncall
    - match:
        severity: ticket
      receiver: sentry-tickets

receivers:
  - name: pagerduty-oncall
    pagerduty_configs:
      - service_key: "$PD_SERVICE_KEY"
  - name: telegram-oncall
    webhook_configs:
      - url: "$TELEGRAM_ALERT_WEBHOOK"
  - name: email-team
    email_configs:
      - to: "oncall@sergeant.team"
  - name: sentry-tickets
    webhook_configs:
      - url: "$SENTRY_WEBHOOK_URL"
```

Джерело routing-правила: [`SLO.md` рядки 217-219](./SLO.md).

---

## 3. Module ownership

Витягнуто з [`AGENTS.md` → Module ownership map](../../AGENTS.md).

| Домен                                | Шлях (ключовий)                                                                           | Owner |
| ------------------------------------ | ----------------------------------------------------------------------------------------- | ----- |
| HTTP / платформа                     | `apps/server/src/http/**`, `apps/server/src/routes/**`                                    | TBD   |
| DB pool                              | `apps/server/src/db/**`                                                                   | TBD   |
| Finyk (mono, budgets, tx)            | `apps/web/src/modules/finyk/**`, `packages/finyk-domain/**`                               | TBD   |
| Fizruk (workouts, local-first)       | `apps/web/src/modules/fizruk/**`, `packages/fizruk-domain/**`                             | TBD   |
| Nutrition (OFF, barcode)             | `apps/web/src/modules/nutrition/**`, `packages/nutrition-domain/**`                       | TBD   |
| Routine (streaks)                    | `apps/web/src/modules/routine/**`, `packages/routine-domain/**`                           | TBD   |
| HubChat / Coach / Weekly Digest (AI) | `apps/web/src/core/**` (hubChat, coach, digest), `apps/server/src/modules/chat/**`        | TBD   |
| Auth (better-auth, sessions)         | `apps/server/src/modules/auth/**`, `apps/web/src/core/Auth*`                              | TBD   |
| Sync (cross-module)                  | `apps/server/src/modules/sync/**`, `apps/web/src/core/useCloudSync*`                      | TBD   |
| Push                                 | `apps/server/src/modules/push/**`, `apps/web/src/core/components/PushNotificationToggle*` | TBD   |

> **Примітка:** `AGENTS.md` не містить іменних owner-ів модулів — лише шляхи та тест-стеки. Заповніть колонку Owner після розподілу відповідальності. Див. [Open questions](#open-questions).

---

## 4. Health endpoints quick reference

Визначені у [`apps/server/src/routes/health.ts`](../../apps/server/src/routes/health.ts).

| Endpoint   | Метод | Відповідь                                                               | Призначення                         |
| ---------- | ----- | ----------------------------------------------------------------------- | ----------------------------------- |
| `/livez`   | GET   | `200 ok` завжди, якщо процес живий                                      | Uptime-check (зовнішні моніторинги) |
| `/readyz`  | GET   | `200 ok` якщо DB pool доступний; `503 unhealthy` інакше                 | Platform healthcheck (Railway)      |
| `/health`  | GET   | Аліас `/readyz` (історичний)                                            | Зворотна сумісність                 |
| `/metrics` | GET   | Prometheus text format; потребує `Authorization: Bearer $METRICS_TOKEN` | Prometheus scrape endpoint          |

Приклад перевірки:

```bash
# Liveness
curl -s https://<api>.up.railway.app/livez

# Readiness (DB pool)
curl -s https://<api>.up.railway.app/readyz

# Metrics (з токеном)
curl -s -H "Authorization: Bearer $METRICS_TOKEN" https://<api>.up.railway.app/metrics
```

---

## 5. Швидкий on-call чеклист при page-алерті

1. **Sentry** → знайди issue за часом алерту → скопіюй `requestId`.
2. **Логи** — фільтруй за `requestId`:
   ```bash
   railway logs --filter 'requestId=req-abc'
   ```
   Або Loki LogQL:
   ```logql
   {app="sergeant-server"} |= "req-abc"
   ```
3. **Dashboard** — відкрий відповідний Grafana dashboard з [`docs/observability/dashboards/`](./dashboards/) (якщо існує).
4. **Runbook** — перейди за посиланням `runbook:` з annotation алерту (кожен алерт у `alert_rules.yml` має `runbook:` анотацію з прямим лінком на секцію [`runbook.md`](./runbook.md)).
5. **Ескалація** → знайди owner модуля з [таблиці §3](#3-module-ownership) → повідом через Telegram / PagerDuty.

---

## 6. Escalation policy

| Рівень | Хто                                                | Коли                                                    |
| ------ | -------------------------------------------------- | ------------------------------------------------------- |
| **L1** | On-call інженер                                    | Перші 15–30 хв після алерту                             |
| **L2** | Module owner (з [таблиці §3](#3-module-ownership)) | Якщо не вдалось локалізувати root cause за 15 хв        |
| **L3** | Maintainer / архітектор (Mark — `@Skords-01`)      | Питання зачіпає архітектурний baseline або cross-module |

---

## 7. Incident communication template

Копіюй у Telegram / email:

```
[INCIDENT] <severity> · <SLO name>
Started: <timestamp UTC>
Symptom: <1-line>
Impact: <who/how affected>
Current state: <investigating|mitigated|resolved>
Next update: <time>
```

**Приклад:**

```
[INCIDENT] page · HTTP API availability
Started: 2026-04-27 03:14 UTC
Symptom: 5xx ratio >14% за останню годину
Impact: усі API-запити, sync нестабільний
Current state: investigating
Next update: 03:30 UTC
```

---

## 8. Post-incident

1. Створити **GitHub issue** з label `incident` і посиланнями на Sentry issue / Loki query.
2. Написати **postmortem** за шаблоном: [`docs/postmortems/TEMPLATE.md`](../postmortems/TEMPLATE.md).
3. Оновити [`runbook.md`](./runbook.md) якщо кроки виявилися неправильними або неповними.

---

## 9. Env-flags для аварійних дій

Змінні оточення для швидкого mitigation на Railway (без редеплою — через Railway dashboard → Variables → re-deploy).

| Змінна                                          | Значення                                | Коли використовувати                        | Alert                                                           |
| ----------------------------------------------- | --------------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| `AI_QUOTA_DISABLED=0` + `AI_DAILY_USER_LIMIT=0` | Вимикає AI-фічі (429 замість fail-open) | `AiQuotaStoreDown` — DB для квот недоступна | [runbook § AiQuotaStoreDown](./runbook.md#aiquotastoredown)     |
| `DATABASE_POOL_MAX`                             | Збільшити (наприклад `20` → `40`)       | `DbPoolSaturated` — черга на з'єднання      | [runbook § DbPoolSaturated](./runbook.md#dbpoolsaturated)       |
| `RATE_LIMIT_BAN_IPS`                            | Comma-separated IP list                 | `AuthRateLimitSpike` — brute-force атака    | [runbook § AuthRateLimitSpike](./runbook.md#authratelimitspike) |
| `SENTRY_TRACES_SAMPLE_RATE=0`                   | Вимкнути trace sampling                 | Sampling створює додаткове навантаження     | —                                                               |

---

## Open questions

- [ ] **Module owners** (§3): `AGENTS.md` не містить іменних owner-ів — усі модулі позначені TBD. Потрібно заповнити після розподілу on-call відповідальності.
- [ ] **Alertmanager config** (§2): `alertmanager.yml` відсутній у репо. Описано очікуваний сетап — потрібно створити і задеплоїти.
- [ ] **Dashboards** (§5): каталог `docs/observability/dashboards/` планується в окремому PR.
- [x] **Postmortem template** (§8): `docs/postmortems/TEMPLATE.md` створено в цьому PR.
