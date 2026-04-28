# Grafana Dashboards

> **Last validated:** 2026-04-27 by @Skords-01. **Next review:** 2026-07-26.

Importable Grafana dashboard JSON files for Sergeant server observability.

## Dashboards

| File                 | Description                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `http-red.json`      | HTTP RED metrics — rate, errors, duration (p50/p95/p99). Filters by `module` and `path`.                |
| `db-use.json`        | Postgres pool USE — utilization, saturation (waiting clients), errors by code, slow queries, durations. |
| `slo-burn-rate.json` | Multi-window multi-burn-rate SLO overview — HTTP, Sync, Auth, AI, External HTTP, process health.        |

## How to import

1. Open Grafana UI.
2. Navigate to **Dashboards → New → Import** (or the "+" icon → Import).
3. Click **Upload JSON file** and select the desired `.json` file, **or** paste the file contents into the "Import via panel json" text area.
4. In the import dialog, select the Prometheus datasource for the `DS_PROMETHEUS` variable.
5. Click **Import**.

## Datasource variables

All dashboards expect a single datasource variable:

| Variable        | Type       | Description                                                   |
| --------------- | ---------- | ------------------------------------------------------------- |
| `DS_PROMETHEUS` | Prometheus | Prometheus instance scraping the Sergeant `/metrics` endpoint |

The `__inputs` section in each JSON declares this variable. Grafana will prompt for it on import.

## Template variables (per dashboard)

### http-red.json

| Variable | Description                                        |
| -------- | -------------------------------------------------- |
| `path`   | Filter by HTTP path (multi-select, default All)    |
| `module` | Filter by module label (multi-select, default All) |

### db-use.json

No additional template variables beyond `DS_PROMETHEUS`.

### slo-burn-rate.json

No additional template variables beyond `DS_PROMETHEUS`. All SLI queries reference pre-computed recording rules from `docs/observability/prometheus/recording_rules.yml`.

## Expected labels

The dashboards rely on labels emitted by `apps/server/src/obs/metrics.ts`:

- **`module`** — domain module (finyk, fizruk, nutrition, routine, core, etc.)
- **`path`** — HTTP route path
- **`status`** / **`status_class`** — HTTP status code / class (2xx, 4xx, 5xx)
- **`op`** — database operation name
- **`code`** — Postgres error code
- **`upstream`** — external HTTP service name (monobank, anthropic, off, usda, etc.)
- **`outcome`** — result category (ok, error, timeout, hit, miss, etc.)
- **`endpoint`** — AI endpoint name (chat, coach, weekly-digest, etc.)

## Recording rules dependency

The **slo-burn-rate** dashboard uses pre-computed recording rules (`sli:*` metrics) defined in [`../prometheus/recording_rules.yml`](../prometheus/recording_rules.yml). Ensure these rules are loaded in your Prometheus configuration. Alert thresholds are defined in [`../prometheus/alert_rules.yml`](../prometheus/alert_rules.yml).

## Compatibility

- **Grafana**: 10+ (schemaVersion 39)
- **Prometheus**: 2.x+ with recording rules support
- **Timezone**: dashboards default to `Europe/Kyiv`

## Related docs

- [SLO definitions](../SLO.md)
- [Runbook](../runbook.md)
- [Dashboard PromQL reference](../dashboards.md)
