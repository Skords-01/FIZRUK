# Мінімальні Grafana dashboards (Prometheus)

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

Це “starter pack” панелей, яких достатньо, щоб швидко зрозуміти: **що саме горить**
(HTTP / DB / Auth / Sync / AI / upstream), **де** і **чому**.

> Порада: для інцидентів завжди корелюй з логами Pino за `requestId`
> (див. `X-Request-Id` у відповідях API) та Sentry issue.

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

---

## Importable Grafana dashboard JSONs

Ready-to-import JSON dashboards live in [`dashboards/`](./dashboards/):

| File                                                    | Scope                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| [`http-red.json`](./dashboards/http-red.json)           | HTTP RED (rate, errors, duration p50/p95/p99) with module/path filter |
| [`db-use.json`](./dashboards/db-use.json)               | Postgres pool USE, query duration, slow queries, DB errors            |
| [`slo-burn-rate.json`](./dashboards/slo-burn-rate.json) | Multi-window multi-burn-rate SLO overview (all domains)               |

Import via Grafana UI: **Dashboards → Import → Upload JSON**. See [`dashboards/README.md`](./dashboards/README.md) for details on datasource variables and expected labels.
