# Sergeant Operations Stack — n8n

Self-hosted n8n для автоматизації ops-задач Sergeant.
Повний контекст — [docs/launch/05-operations-and-automation.md](../docs/launch/05-operations-and-automation.md).

## Що всередині

```
ops/
├── docker-compose.ops.yml      # n8n + Postgres (compose stack)
├── .env.ops.example            # Шаблон env-змінних
├── README.md                   # Цей файл
└── n8n-workflows/
    ├── 01-billing-pipeline.json          # Stripe → DB → Telegram
    ├── 02-failed-payment-recovery.json   # Failed payment → email + downgrade
    ├── 03-sentry-alert-routing.json      # Sentry → Telegram (fatal / warning)
    ├── 04-daily-backup-verification.json # Cron 03:00 → Railway → sanity SQL
    ├── 05-renovate-pr-auto-handler.json  # Renovate PR → auto-approve patch / notify
    └── 06-mono-webhook-enrichment.json   # Mono tx → AI categorize → budget alert
```

## Quick start

### 1. Env vars

```bash
cp ops/.env.ops.example ops/.env.ops
# Заповни значення (див. коментарі у файлі)
```

Мінімум для старту:

| Змінна                   | Звідки                                                  |
| ------------------------ | ------------------------------------------------------- |
| `N8N_PASSWORD`           | `openssl rand -base64 24`                               |
| `N8N_ENCRYPTION_KEY`     | `openssl rand -hex 32`                                  |
| `N8N_DB_PASSWORD`        | `openssl rand -base64 24`                               |
| `TELEGRAM_BOT_TOKEN`     | [@BotFather](https://t.me/BotFather) → `/newbot`        |
| `TELEGRAM_ALERT_CHAT_ID` | `curl "https://api.telegram.org/bot<TOKEN>/getUpdates"` |

### 2. Запуск (локально)

```bash
docker compose -f ops/docker-compose.ops.yml --env-file ops/.env.ops up -d
```

n8n UI: [http://localhost:5678](http://localhost:5678)

### 3. Імпорт workflows

1. Відкрий n8n UI → **Workflows** → **Import from File**
2. Імпортуй кожен `.json` з `ops/n8n-workflows/`
3. Відкрий кожен workflow → налаштуй **Credentials** (Postgres, Telegram, Stripe, etc.)
4. Активуй workflow (toggle → **Active**)

### 4. Deploy на Railway

```bash
# Варіант A: Railway CLI
railway login
railway init
railway up --detach

# Варіант B: Railway UI
# railway.app → New Project → Docker Compose → upload ops/docker-compose.ops.yml
```

Після деплою:

- Встанови custom domain (Cloudflare DNS → CNAME)
- Оновити `WEBHOOK_URL` та `N8N_HOST` у env vars
- Переконайся що persistent volume підключено до `/home/node/.n8n`

## Workflows — деталі

### 01. Billing Pipeline

**Тригер:** Stripe webhook `customer.subscription.created`
**Дія:** Update user plan → Pro в БД → Telegram повідомлення в `#revenue`

### 02. Failed Payment Recovery

**Тригер:** Stripe webhook `invoice.payment_failed`
**Дія:** Telegram alert → Email "оновіть картку" → Retry wait → Downgrade після 4 спроб

### 03. Sentry Alert Routing

**Тригер:** Sentry webhook (new issue / spike)
**Дія:** Filter severity ≥ warning → Telegram `#incidents` (fatal отримує окремий формат)

### 04. Daily Backup Verification

**Тригер:** Cron 03:00 UTC
**Дія:** Railway API → restore на staging → sanity SQL → Telegram OK / CRITICAL

### 05. Renovate PR Auto-Handler

**Тригер:** GitHub webhook `pull_request.opened` (author = renovate[bot])
**Дія:** Patch → auto-approve; minor/major → Telegram review needed

### 06. Mono Webhook Enrichment

**Тригер:** Mono webhook (нова транзакція)
**Дія:** Save → AI categorize (Claude) → Update DB → Budget threshold check → Telegram alert

## Credentials у n8n

Після імпорту workflows — налаштуй credentials через n8n UI:

| Credential        | Тип                    | Потрібно для   |
| ----------------- | ---------------------- | -------------- |
| Sergeant Postgres | PostgreSQL             | 01, 02, 04, 06 |
| Sergeant Ops Bot  | Telegram Bot API       | 01–06          |
| Stripe            | Webhook signing secret | 01, 02         |
| Resend            | API Key                | 02             |
| Anthropic         | API Key                | 06             |
| GitHub            | Token / Webhook secret | 05             |
| Railway           | API Token              | 04             |

## Troubleshooting

### n8n не стартує

```bash
docker compose -f ops/docker-compose.ops.yml logs n8n
```

Частіше за все — неправильний `N8N_DB_PASSWORD` або Postgres ще не ready.

### Webhook не працює

- Перевір `WEBHOOK_URL` — має бути публічний URL (не localhost у prod)
- Stripe/GitHub/Sentry webhook endpoint: `{WEBHOOK_URL}/webhook/{path}`

### Telegram не відправляє

- Перевір `TELEGRAM_BOT_TOKEN` і `TELEGRAM_ALERT_CHAT_ID`
- Бот має бути адміном каналу
- Тест: `curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d chat_id=<ID> -d text="test"`

## Моніторинг (Prometheus + Grafana)

Prometheus і Grafana включені в той самий compose-файл.

| Сервіс     | URL                   | Логін             |
| ---------- | --------------------- | ----------------- |
| Prometheus | http://localhost:9090 | —                 |
| Grafana    | http://localhost:3001 | `admin` / `admin` |

Grafana автоматично підключає Prometheus як datasource (provisioning через `ops/grafana/datasources/prometheus.yml`).

Prometheus скрейпить `GET /metrics` основного сервера (захищено Bearer token `METRICS_TOKEN`).

**Потрібні змінні в `.env.ops`:**

```
METRICS_TOKEN=<той самий що у .env сервера>
SERVER_METRICS_URL=http://host.docker.internal:3000/metrics
```

**Prometheus targets:** http://localhost:9090/targets

**Troubleshooting — метрики не збираються:**

1. Переконайся що `pnpm dev:server` запущений
2. Перевір збіг `METRICS_TOKEN` у `.env.ops` і `.env`
3. `curl -H "Authorization: Bearer <token>" http://localhost:3000/metrics`

## Додавання нового workflow

Дивись [`docs/playbooks/add-n8n-workflow.md`](../docs/playbooks/add-n8n-workflow.md).

## Вартість

| Компонент            | Вартість/міс  |
| -------------------- | ------------- |
| n8n (Railway shared) | $3–5          |
| n8n Postgres         | included      |
| **Total**            | **~$3–5/міс** |
