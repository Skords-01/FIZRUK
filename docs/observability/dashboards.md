# Мінімальні Grafana dashboards (Prometheus)

Це "starter pack" панелей, яких достатньо, щоб швидко зрозуміти: **що саме горить**
(HTTP / DB / Auth / Sync / AI / upstream), **де** і **чому**.

> Порада: для інцидентів завжди корелюй з логами Pino за `requestId`
> (див. `X-Request-Id` у відповідях API) та Sentry issue.

## Готові JSON-експорти (Grafana 10.x)

Імпортабельні JSON-файли знаходяться у [`dashboards/`](./dashboards/). Кожний
файл — повноцінний Grafana dashboard із `datasource: $DS_PROMETHEUS`, `refresh: 30s`,
`time: now-6h`, тегом `sergeant`.

| Dashboard     | Файл                                                  | Що показує                                                                                                |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| HTTP RED      | [`http-red.json`](./dashboards/http-red.json)         | RPS, 5xx ratio, p95 latency by path, in-flight, app_errors breakdown, SLO burn-rate                       |
| Sync          | [`sync.json`](./dashboards/sync.json)                 | Outcomes by op/module/outcome, p95 duration, payload p95, conflict ratio, SLO burn-rate                   |
| Auth          | [`auth.json`](./dashboards/auth.json)                 | Auth outcomes, session lookup p95, rate-limit hits, sign-in success rate                                  |
| AI Cost       | [`ai-cost.json`](./dashboards/ai-cost.json)           | Token rate by model, daily spend estimate, cache-hit ratio, quota blocks/fail-open, AI outcomes & latency |
| HubChat Tools | [`hubchat.json`](./dashboards/hubchat.json)           | Tool invocation leaderboard, executed/proposed ratio, unknown_tool, truncations                           |
| Postgres Pool | [`db-pool.json`](./dashboards/db-pool.json)           | Pool total/idle/waiting, utilization %, query p95, slow queries, DB errors by SQLSTATE                    |
| Frontend CWV  | [`frontend-cwv.json`](./dashboards/frontend-cwv.json) | LCP/INP/FCP/TTFB/CLS — good/needs-improvement/poor ratio + p75 (baseline mode)                            |

### Як імпортувати у Grafana

1. Відкрий Grafana → **Dashboards** → **New** → **Import**.
2. Натисни **Upload JSON file** і вибери потрібний `.json` із `docs/observability/dashboards/`.
3. Обери Prometheus datasource у випадаючому списку `DS_PROMETHEUS`.
4. Натисни **Import**.

Або через CLI:

```bash
# Приклад для http-red.json
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -d "{\"dashboard\": $(cat docs/observability/dashboards/http-red.json), \"overwrite\": true}"
```

---

## HTTP (RED)

- **RPS по route**:
  - `sum by (path) (rate(http_requests_total[5m]))`
- **5xx rate по route**:
  - `sum by (path) (rate(http_requests_total{status=~"5.."}[5m]))`
- **p95 latency по route**:
  - `histogram_quantile(0.95, sum by (le, path) (rate(http_request_duration_ms_bucket[5m])))`
- **in-flight**:
  - `sum(http_in_flight)`

## Postgres pool / slow queries

- **pool waiting (контеншн)**:
  - `max(db_pool_waiting)`
- **p95 query duration по op**:
  - `histogram_quantile(0.95, sum by (le, op) (rate(db_query_duration_ms_bucket[5m])))`
- **slow query counter**:
  - `sum by (op) (rate(db_slow_queries_total[5m]))`

## Auth

- **auth outcomes**:
  - `sum by (op, outcome) (rate(auth_attempts_total[5m]))`
- **p95 session lookup**:
  - `histogram_quantile(0.95, sum by (le, outcome) (rate(auth_session_lookup_duration_ms_bucket[5m])))`

## Sync

- **sync outcomes**:
  - `sum by (op, module, outcome) (rate(sync_operations_total[5m]))`
- **p95 sync duration**:
  - `histogram_quantile(0.95, sum by (le, op, module) (rate(sync_duration_ms_bucket[5m])))`
- **payload size p95**:
  - `histogram_quantile(0.95, sum by (le, op, module) (rate(sync_payload_bytes_bucket[5m])))`

## AI / External upstream

- **external upstream outcomes**:
  - `sum by (upstream, outcome) (rate(external_http_requests_total[5m]))`
- **external upstream p95**:
  - `histogram_quantile(0.95, sum by (le, upstream, outcome) (rate(external_http_duration_ms_bucket[5m])))`
- **AI quota blocks**:
  - `sum by (reason) (rate(ai_quota_blocks_total[5m]))`
- **AI quota fail-open (критично для білінгу)**:
  - `sum by (reason) (rate(ai_quota_fail_open_total[5m]))`

## Rate limiting

- **blocked/allowed**:
  - `sum by (key, outcome) (rate(rate_limit_hits_total[5m]))`
