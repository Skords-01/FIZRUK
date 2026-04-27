# 05. Operations & Automation: як контролювати, відстежувати, організовувати

> Як адмініструвати весь стек, не вигорівши: 6 операційних зон, правило «3 вкладки», daily/weekly ритуал, автоматизація через n8n + OpenClaw.
> Pre-MVP draft. Цифри (вартість self-host, LLM, час на task) — оцінкові.

---

## TL;DR

> **Дві ключові ідеї:**
>
> 1. **n8n = конвеєр (робить).** Тригер → дія → запис у БД/Telegram. Нон-стоп. Без думання.
> 2. **OpenClaw = асистент (думає і доповідає).** Раз на день/тиждень синтезує що відбулось у системі, пише вердикт у Telegram, відповідає на ad-hoc запити.
>
> Разом вони зводять щоденне адміністрування Sergeant до **5 хвилин на день / 30 хвилин на тиждень** і до **однієї вкладки** (Telegram).

---

## 1. Шість операційних зон

Все що відбувається в Sergeant можна класифікувати по 6 зонах. Кожна зона має:

- **Власника** (зараз — ти; пізніше — найманий або делегований).
- **Основний інструмент** (де живуть дані).
- **Алерти** (що автоматично йде в Telegram).
- **Daily/weekly ритуал**.

| #   | Зона                   | Стек                              | Власник | Daily? | Weekly? |
| --- | ---------------------- | --------------------------------- | ------- | ------ | ------- |
| 1   | **Product**            | Vercel + Railway + Sentry         | ти      | 1 хв   | 5 хв    |
| 2   | **Revenue**            | Stripe + Postgres `subscriptions` | ти      | 1 хв   | 5 хв    |
| 3   | **Analytics & Growth** | PostHog + Loops + Buffer          | ти      | 1 хв   | 10 хв   |
| 4   | **DevOps & CI**        | GitHub + Railway + Renovate       | ти      | 1 хв   | 5 хв    |
| 5   | **Support**            | Crisp + Telegram bot + Canny      | ти      | 1 хв   | 5 хв    |
| 6   | **Automation**         | n8n + OpenClaw                    | ти      | 0 хв   | 0 хв    |

**Total:** 5 хвилин/день, 30 хвилин/тиждень.
Зона 6 (Automation) — це **мета-зона**: вона обслуговує інші п'ять. Якщо налаштована правильно, її саму контролювати не треба.

---

### Зона 1 — Product

| Що               | Де                                   | Алерт у Telegram           |
| ---------------- | ------------------------------------ | -------------------------- |
| Frontend health  | Vercel deployments                   | Build failed               |
| Backend uptime   | Railway / Prometheus `/metrics`      | API 5xx > 1 % за 5 хв      |
| Errors           | Sentry (web + server)                | New issue / spike > 10/хв  |
| Performance      | Vercel Speed Insights, Lighthouse CI | Core Web Vitals деградація |
| PWA install rate | PostHog                              | < 5 % за тиждень           |
| API latency      | Prometheus `http_request_duration`   | p95 > 1 с протягом 10 хв   |

**Daily check:** Vercel dashboard (1 deployment column) → Sentry Issues (Today) → готово.
**Weekly:** прогнати по 5 ключових ендпоінтах метрики p50/p95/p99, переглянути top-5 Sentry issues.

---

### Зона 2 — Revenue

| Що                     | Де                                    | Алерт у Telegram                          |
| ---------------------- | ------------------------------------- | ----------------------------------------- |
| MRR                    | Stripe Dashboard / БД view            | Drop > 10 % WoW                           |
| New subscriptions      | Stripe webhook → БД                   | Кожна нова Pro-підписка (motivational)    |
| Churn                  | Stripe webhook `subscription.deleted` | Кожен cancel + причина (з retention flow) |
| Failed payments        | `invoice.payment_failed`              | Кожен failed → одразу email + Telegram    |
| Disputes / chargebacks | `charge.disputed`                     | Кожен → critical                          |
| Refunds                | Manual у Stripe Dashboard             | —                                         |

**Daily check:** Stripe Dashboard → MRR + new subs за 24 год.
**Weekly:** churn по причинах (з cancel survey), revenue per user, conversion free→Pro.

---

### Зона 3 — Analytics & Growth

| Що                      | Де                     | Алерт у Telegram             |
| ----------------------- | ---------------------- | ---------------------------- |
| Signups (DAU нових)     | PostHog                | Drop > 50 % vs 7-day average |
| Activation rate         | PostHog funnel         | Drop > 20 % WoW              |
| D1 / D7 / D30 retention | PostHog cohorts        | Drop > 10 % WoW              |
| Paywall hit rate        | PostHog `paywall_hit`  | —                            |
| Free→Pro conversion     | PostHog + Stripe       | < 2 % за тиждень             |
| Email campaigns         | Loops dashboard        | Bounce rate > 5 %            |
| Social posts            | Buffer / Typefully     | —                            |
| Referrals               | БД `referrals` таблиця | Top-3 рефералери за тиждень  |

**Daily check:** PostHog Today → signups + activation funnel.
**Weekly:** повна аналітика на 7-day cohort, content review (що з постів зайшло).

---

### Зона 4 — DevOps & CI

| Що                 | Де                 | Алерт у Telegram               |
| ------------------ | ------------------ | ------------------------------ |
| CI status          | GitHub Actions     | Failed workflow на main        |
| PR queue           | GitHub             | Devin Review failed            |
| Renovate PRs       | GitHub             | Major-version PR опен > 7 днів |
| Migrations         | Railway pre-deploy | Migration failed               |
| DB backups         | Railway            | Backup failed                  |
| DB storage         | Railway metrics    | > 80 % capacity                |
| Redis storage      | Railway metrics    | > 80 %                         |
| Container restarts | Railway logs       | > 3/год                        |
| Secrets expiry     | Manual / GitHub    | < 30 днів до expiry            |

**Daily check:** GitHub Actions main branch → green?
**Weekly:** Renovate queue, dependency audit (`pnpm audit`), backup verification.

---

### Зона 5 — Support

| Що                             | Де                   | Алерт у Telegram                  |
| ------------------------------ | -------------------- | --------------------------------- |
| Live chat (in-app)             | Crisp                | Нове повідомлення (з делеєм 5 хв) |
| Telegram bot inbox             | @sergeant_bot        | Кожне нове DM                     |
| Email support                  | support@…            | Forward → Telegram                |
| Bug reports                    | Sentry user feedback | Кожен з відсутнім matching issue  |
| Feature requests               | Canny                | Daily digest ranks                |
| App reviews (Play / App Store) | Manual / API         | Review < 4★                       |

**Daily check:** Telegram bot inbox → answer.
**Weekly:** Canny top requests, NPS digest з Loops, recap відповідей.

---

### Зона 6 — Automation (мета-зона)

Це шар, який обслуговує всі інші 5 зон. Деталі — у §5–§6.

```
              ┌───────────────────────┐
              │   n8n (конвеєр)       │  ← робить
              │   self-hosted, $5/міс │
              └───────────┬───────────┘
                          │
         тригери з всіх 5 зон
                          │
              ┌───────────▼───────────┐
              │   Telegram            │
              │   #sergeant-alerts    │
              └───────────────────────┘
                          ▲
                          │
              ┌───────────┴───────────┐
              │   OpenClaw (асистент) │  ← думає і доповідає
              │   self-hosted, $3-5   │
              │   + LLM API           │
              └───────────────────────┘
```

---

## 2. Правило «3 вкладки» (а потім — 1 вкладки)

Замість 8+ дашбордів які треба обходити вручну — звести моніторинг до **3 вкладок**:

| Вкладка                        | Навіщо                                           | Кого алертить |
| ------------------------------ | ------------------------------------------------ | ------------- |
| **Telegram #sergeant-alerts**  | Всі критичні алерти автоматично, push на телефон | Тебе          |
| **Grafana / Notion dashboard** | MRR, DAU, errors, queue depth — одним поглядом   | —             |
| **GitHub / Railway**           | Тільки коли реально кодиш / деплоїш              | —             |

**З OpenClaw — можна скоротити до 1 вкладки (Telegram).** OpenClaw сам приходить вранці з digest `«За ніч: 3 нові підписки, 0 інцидентів, 1 PR від Renovate (auto-merge готовий), 12 сігнапів. Усе зелене»`. Тоді ти відкриваєш дашборд тільки якщо OpenClaw сказав щось ненормальне.

### Anti-pattern — як НЕ моніторити

```
❌ 8 вкладок: Vercel + Railway + Sentry + Stripe + PostHog + GitHub + Crisp + Loops
❌ Перевірка вранці: відкрив всі 8, по 30 секунд на кожну = 4 хв витратив, нічого не зрозумів
❌ Алерти на email — губляться у пошті
❌ Алерти у Slack без push — не побачиш до вечора
❌ "Я подивлюсь дашборд коли буду думати про це"
```

```
✅ 1 канал у Telegram з push на телефон → бачиш ВСЕ що важливо за 30 секунд
✅ Дашборд — раз на тиждень для тренду, не для тригеру
✅ OpenClaw raster: щоранку 1 повідомлення в Telegram з резюме
```

---

## 3. Daily / Weekly / Monthly ритуал

### Daily (5 хв; з OpenClaw — 1 хв)

```
1. Telegram #sergeant-alerts → є red flag? Розібратись. Нема? Далі.
2. OpenClaw morning brief (якщо налаштовано):
   "За ніч: X сігнапів, Y підписок, Z errors. Все ок? Так — ✓; Ні — деталі"
3. Stripe → нові підписки (для emotional fuel)
4. Telegram bot inbox → support
5. (опціонально) PostHog Today якщо є гіпотеза
```

### Weekly (30 хв, в неділю ввечері)

```
1. Grafana dashboard → MRR / DAU / churn / errors WoW
2. PostHog → cohorts, funnels, top events
3. GitHub → PR queue: Renovate, code review, mergerable
4. Stripe → revenue summary, refunds, disputes
5. Canny → top 5 feature requests
6. Loops → email metrics (open / click / unsub)
7. Sentry → top 5 issues, чи є те що треба фіксити
8. Buffer → next week content schedule
9. Notion / GitHub Projects → roadmap update
10. OpenClaw weekly report (якщо налаштовано):
    AI генерує summary тижня + 3 рекомендації
```

### Monthly (2 год, перше число місяця)

```
1. Financial review: revenue, costs, margin, runway
2. Cohort analysis: D30 retention, LTV trend
3. Pricing experiment review (з PostHog feature flags)
4. Roadmap update: що зробив, що далі (місячний план)
5. Content audit: що зайшло (top 5 постів), що ні
6. Tooling review: чи треба ще щось додати? Викинути?
7. Backup test: відновити staging з backup
8. Security review: pnpm audit, expired secrets
9. Personal: чи не вигораю? Що покращити в процесі?
```

---

## 4. Telegram як operational hub

Один канал = одна точка істини. Архітектура:

```
@sergeant_alerts (приватний канал)
   ├─ #incidents          (errors, downtime, payment fails) [critical]
   ├─ #revenue            (нові підписки, churn)            [info+motivational]
   ├─ #growth             (signups, activation, top users)   [info]
   ├─ #ops                (CI fails, Renovate, deploy)       [info]
   ├─ #support            (нові тікети) [info]
   └─ #digest             (OpenClaw morning + weekly)        [info]

@sergeant_bot (DM bot)
   ├─ Support inbox: юзер DM → forward тобі
   ├─ Команди: /mrr, /errors, /signups → quick metric
   └─ /ops → передає в OpenClaw → AI відповідь
```

**Налаштування — мінімальний MVP:**

1. Створи приватний Telegram-канал.
2. Створи бота в @BotFather, отримай `BOT_TOKEN`.
3. Додай бота адміном у канал, отримай `CHAT_ID`.
4. У n8n / Railway env-vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`.
5. Перший workflow у n8n: Stripe webhook `customer.subscription.created` → Telegram message.

---

## 5. Платформи автоматизації — порівняння

| Критерій                    | **n8n** 🥇             | **OpenClaw** 🤖    | **Make.com** 🥈       | **Zapier** 🥉        | **Klaviyo** ❌     |
| --------------------------- | ---------------------- | ------------------ | --------------------- | -------------------- | ------------------ |
| **Роль**                    | Конвеєр (робить)       | Асистент (думає)   | Конвеєр (робить)      | Конвеєр (робить)     | Email marketing    |
| **Хостинг**                 | Self-host (Docker)     | Self-host (Docker) | SaaS                  | SaaS                 | SaaS               |
| **Open-source**             | ✅ Apache 2.0          | ✅                 | ❌                    | ❌                   | ❌                 |
| **Вартість MVP**            | $3–5/міс (Railway)     | $3–5/міс + LLM API | Free tier 1K ops/міс  | $19+/міс             | $45+/міс           |
| **Вартість scale**          | $10–20/міс             | $10 + LLM ($20–50) | $9–29+/міс            | $69–599/міс          | $100+/міс          |
| **Інтеграції**              | 400+ нативних          | будь-що через MCP  | 1500+                 | 6000+                | Вузький: email/SMS |
| **AI / LLM**                | Optional nodes         | First-class        | Optional              | Optional             | Optional           |
| **Visual builder**          | ✅ Node-based          | ❌ Prompt-based    | ✅ Best-in-class      | ✅ Step-based        | ✅                 |
| **Self-hosted = privacy**   | ✅ Дані не лишають VPS | ✅                 | ❌                    | ❌                   | ❌                 |
| **Криві задачі**            | Складні multi-step     | Ad-hoc, аналітика  | Mid-complexity        | Простий if-this-then | Email flows        |
| **Підходить для Sergeant?** | ✅✅✅                 | ✅✅✅             | ⚠️ якщо не хочеш host | ❌ дорого            | ❌ overkill        |

### Висновки

1. **n8n + OpenClaw — основа.** Self-host обидва на Railway за ~$8/міс. Безкоштовний open-source. Privacy. Гнучкість.
2. **Make.com — fallback** якщо self-host лякає (1K ops/міс free на старті вистачить).
3. **Zapier — пропустити.** Все що Zapier робить — n8n робить дешевше.
4. **Klaviyo — пропустити.** Email marketing вже покривається Loops (в [03 §6.4](./03-services-and-toolstack.md#64-email)). Klaviyo — для e-commerce з товарними каталогами.

---

## 6. Зона 6 у деталях: n8n + OpenClaw

### 6.1 Розділення відповідальності

```
┌─────────────────────────────────────────────────────────────────┐
│ ТРИГЕР                  → ХТО ОБРОБЛЯЄ → ВИХІД                  │
├─────────────────────────────────────────────────────────────────┤
│ Stripe webhook          → n8n          → БД + Telegram          │
│ Sentry alert            → n8n          → Telegram               │
│ GitHub failed CI        → n8n          → Telegram               │
│ Cron "9:00 щоранку"     → OpenClaw     → Telegram digest        │
│ Cron "Sun 18:00"        → OpenClaw     → Weekly report          │
│ Юзер DM боту /churn     → OpenClaw     → AI-аналіз churn        │
│ PR opened (Renovate)    → OpenClaw     → Comment з risk score   │
│ Posthog drop > 50 %     → OpenClaw     → Telegram з гіпотезою   │
└─────────────────────────────────────────────────────────────────┘
```

**Правило:** якщо це **детермінований конвеєр** (тригер X → дія Y) — це **n8n**. Якщо це **синтез / аналіз / контекст** (з'ясувати чому, написати recap, відповісти на питання) — це **OpenClaw**.

### 6.2 6 конкретних автоматизацій для n8n

#### 1. Billing pipeline

```
Stripe webhook (subscription.created)
  → Validate signature
  → Update БД user.plan = 'pro'
  → Send Telegram: "🎉 Нова Pro: user@email (yearly, ₴799)"
  → Send Resend email: welcome to Pro
  → Increment PostHog event: plan_upgraded
```

#### 2. Failed payment recovery

```
Stripe webhook (invoice.payment_failed)
  → Send Telegram: "⚠️ Failed payment: user@email"
  → Send Resend: "Update your card" + magic link to portal
  → Schedule retry reminder T+24h, T+72h, T+7d
  → Якщо T+7d failed → downgrade to free + cancel email
```

#### 3. Sentry alert routing

```
Sentry webhook (new issue OR spike)
  → Filter: severity >= warning
  → Telegram message з link на Sentry issue
  → IF severity == fatal: ping @you
  → Update Notion incidents log
```

#### 4. Daily backup verification

```
Cron 03:00 UTC
  → Railway API: list latest backup
  → Spin up staging instance (на Railway, ephemeral)
  → Restore backup
  → Run sanity SQL: SELECT count(*) FROM users
  → IF success: Telegram "✓ Backup OK ($DATE)"
  → IF fail: Telegram CRITICAL alert
```

#### 5. Renovate PR auto-handler

```
GitHub webhook (pull_request opened, author=renovate[bot])
  → Run risk check: major / minor / patch
  → IF patch + CI green: auto-approve + automerge
  → IF minor: comment "ready for review", Telegram digest
  → IF major: post in Telegram з summary changelog
```

#### 6. Mono webhook → enrichment

```
Mono webhook (нова transaction)
  → Save to module_data
  → Categorize via OpenAI/Claude (через AI node)
  → Update budget tracking
  → IF spending > budget threshold → Push to user
  → Telegram (admin) digest WoW spending behavior (агрегат)
```

### 6.3 6 конкретних задач для OpenClaw

#### 1. Daily morning briefing

```
Cron 08:30 Kyiv
  → OpenClaw збирає за останні 24h:
    - Stripe MRR delta
    - PostHog signups
    - Sentry new issues
    - GitHub PR queue
    - Open Telegram support тікети
  → Генерує текст ≤ 8 рядків
  → Telegram #digest:
    "Доброго ранку. За ніч:
     ├ MRR: ₴12.4K (+₴99 нова Pro річна)
     ├ Сігнапи: 23 (медіана 18, +28%)
     ├ Errors: 0 нових
     ├ Support: 2 тікети чекають
     └ PR queue: 1 Renovate (auto-merge готовий)
     Усе зелене. Що робимо сьогодні?"
```

#### 2. Ad-hoc запити (Telegram bot)

```
DM боту: "/ops чому signups впали?"
  → OpenClaw:
    - PostHog API: signups за 7 днів vs 7 попередніх
    - Vercel deploys: чи був deploy сьогодні?
    - Twitter mentions / Telegram channel посади
    - PostHog funnel: де відвал?
  → Відповідь з гіпотезою + лінки
```

#### 3. Контент-генератор

```
Cron Mon 10:00
  → OpenClaw:
    - Аналізує тиждень: top metric, цікавий тренд
    - Драфтує 3 варіанти X/Threads thread
    - Драфтує 1 пост у Telegram
    - Постить у Buffer queue (як draft)
  → Telegram: "Контент тижня готовий у Buffer. Approve?"
```

#### 4. Аналіз churn

```
Cron Sun 18:00 + Stripe subscription.deleted webhook
  → OpenClaw збирає cancel survey responses
  → Кластеризує причини (price / fitness only / bugs / not used)
  → Telegram weekly:
    "Цього тижня cancel-нули 4 (1.2 %). Top причина: 'не користувався'.
     Гіпотеза: переглянути onboarding day-3."
```

#### 5. Trend detection

```
Cron daily 23:00
  → OpenClaw сканує:
    - PostHog: чи є event який зріс/упав > 50 % за 7 днів
    - Sentry: чи є issue що йде на повторюванні
    - Stripe: чи є dispute pattern
  → IF знайдено → Telegram з рекомендацією
  → ELSE → нічого (не спамити)
```

#### 6. Code review assistant (PR коменти)

```
GitHub webhook (pull_request opened, NOT renovate)
  → OpenClaw:
    - Читає diff
    - Читає AGENTS.md hard rules
    - Чекає на CI зеленість
    - Якщо зелений → коментар у PR з summary + risk
  → Не блокує merge, just информує
```

### 6.4 Data flow повністю

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Stripe           │     │ Sentry           │     │ GitHub           │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │webhook                 │webhook                 │webhook
         ▼                         ▼                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                          n8n (workflows)                            │
│  validate · enrich · route · transform · persist                    │
└────────┬───────────────┬──────────────────────┬────────────────────┘
         │               │                       │
         │persist        │alert (immediate)      │log (analytics)
         ▼               ▼                       ▼
   ┌──────────┐    ┌─────────────┐         ┌──────────┐
   │ Postgres │    │ Telegram    │         │ PostHog  │
   │          │    │ #incidents  │         │          │
   │          │    │ #revenue    │         │          │
   └────┬─────┘    │ #ops        │         └────┬─────┘
        │          └─────────────┘              │
        │                  ▲                    │
        │                  │                    │
        │      ┌───────────┴───────────┐        │
        └─────▶│      OpenClaw         │◀───────┘
               │                        │
               │ daily/weekly digest    │
               │ ad-hoc queries         │
               │ trend detection        │
               │ content drafting       │
               └───────────┬────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │ Telegram    │
                   │ #digest     │
                   │ DM @bot     │
                   └─────────────┘
```

Підсумок:

- **n8n** пише в `#incidents`, `#revenue`, `#ops` — миттєві технічні алерти.
- **OpenClaw** пише в `#digest` і відповідає у DM `@sergeant_bot` — синтез і аналіз.

---

## 7. Розгортання

### 7.1 n8n — self-host на Railway

```bash
# 1. New Railway project → Template "n8n"
#    або з нуля через Dockerfile:
#    https://hub.docker.com/r/n8nio/n8n

# 2. Persistent volume for /home/node/.n8n (workflows + credentials)
#    Railway: Volumes → mount /data

# 3. Env vars:
N8N_HOST=n8n.your-domain.com
N8N_PROTOCOL=https
N8N_PORT=5678
WEBHOOK_URL=https://n8n.your-domain.com/
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<pwgen>
N8N_ENCRYPTION_KEY=<openssl rand -hex 32>
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=<your-railway-postgres>
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=...
DB_POSTGRESDB_PASSWORD=...
TZ=Europe/Kyiv

# 4. Custom domain → Cloudflare DNS → CNAME до Railway
# 5. Перший workflow: Stripe → Telegram (test)
```

**Вартість:** ~$3–5/міс (Railway shared CPU + 512 MB RAM + 1 GB disk).

### 7.2 OpenClaw — self-host на Railway

> OpenClaw тут — узагальнена назва для self-hosted AI ops-агента (e.g., OpenHands, AutoGPT-like, або кастом на Anthropic SDK). Якщо вирішиш не self-host-ити — заміни на Claude Projects / ChatGPT Tasks з MCP-інтеграцією.

```bash
# Варіант A: Docker
docker run -d \
  --name openclaw \
  -p 3030:3030 \
  -v /data/openclaw:/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e TELEGRAM_BOT_TOKEN=... \
  -e TELEGRAM_CHAT_ID=... \
  -e POSTHOG_KEY=... \
  -e STRIPE_KEY=... \
  -e GITHUB_TOKEN=... \
  -e RAILWAY_TOKEN=... \
  openclaw/openclaw:latest

# Варіант B: curl install (якщо є офіційний script)
curl -fsSL https://openclaw.dev/install | sh

# Варіант C: Railway template (якщо існує)
```

**Env vars (мінімум):**

```env
LLM_PROVIDER=anthropic        # або openai
ANTHROPIC_API_KEY=...
LLM_MODEL=claude-sonnet-4-5

# Інтеграції — credentials до сервісів які OpenClaw читає
STRIPE_SECRET_KEY=...
POSTHOG_API_KEY=...
SENTRY_AUTH_TOKEN=...
GITHUB_TOKEN=...
RAILWAY_TOKEN=...

# Telegram — куди писати
TELEGRAM_BOT_TOKEN=...
TELEGRAM_DIGEST_CHAT_ID=...

# Schedules
DAILY_BRIEF_CRON="30 8 * * *"
WEEKLY_REPORT_CRON="0 18 * * 0"
TZ=Europe/Kyiv
```

**Вартість:**

- Self-host (Railway): ~$3–5/міс (CPU + RAM).
- LLM API: ~$20–50/міс (Sonnet, ~10M tokens — щодня daily brief + weekly report + ad-hoc).
- Total: ~$25–55/міс.

### 7.3 Telegram bot

```bash
# 1. @BotFather → /newbot → @sergeant_ops_bot
#    Отримай BOT_TOKEN
# 2. Створи приватний канал @sergeant_alerts
# 3. Додай бота адміном у канал
# 4. /getUpdates щоб взяти CHAT_ID
#    curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
# 5. Створи topics у каналі: #incidents, #revenue, #ops, #digest
#    (Telegram Topics — як підпапки в групі)
```

---

## 8. GitHub Projects як roadmap-і task-tracker

GitHub Issues + Projects вже є (зона 4). Як використовувати ефективно:

### 8.1 Структура проектів

```
Project: Sergeant Roadmap
  ├ Status: Backlog · This Week · In Progress · Review · Done
  ├ Priority: P0 (critical) · P1 · P2 · P3
  ├ Module: Finyk · Fizruk · Routine · Nutrition · Hub · Backend · DevOps · Marketing
  └ Type: feat · fix · docs · refactor · chore

Project: Sergeant Marketing
  ├ Status: Idea · Drafting · Scheduled · Posted · Analyzed
  ├ Channel: Twitter · Threads · Telegram · DOU · TikTok · Email
  └ Type: build-in-public · launch · educational · UGC

Project: Sergeant Operations
  ├ Status: Active · Resolved · Postponed
  ├ Severity: critical · high · medium · low
  └ Zone: Product · Revenue · Analytics · DevOps · Support
```

### 8.2 Auto-create issues from automation

```
n8n workflow: Sentry critical issue → GitHub Issue (з лейблом zone:product, severity:high)
n8n workflow: Cancel survey "bug" → GitHub Issue (label: customer-bug)
OpenClaw weekly report → GitHub Issue (label: weekly-action-items)
```

Щоразу як OpenClaw знаходить тренд — він автоматично створює issue з контекстом.

---

## 9. Anti-patterns

| ❌ НЕ роби                                     | ✅ Замість цього                                          |
| ---------------------------------------------- | --------------------------------------------------------- |
| Використовуй n8n для всього (включно з ad-hoc) | n8n для конвеєрів, OpenClaw для синтезу                   |
| Використовуй OpenClaw для billing pipeline     | Billing — детермінований flow → n8n. AI може галюцинувати |
| Алерти у email                                 | Алерти в Telegram з push на телефон                       |
| 1 загальний канал на все                       | Topics: #incidents, #revenue, #ops, #digest, #support     |
| Алерт на кожен event                           | Threshold-based: тільки якщо drop > X % або spike > Y     |
| Cron у `node-cron` всередині API process       | Окремий worker / n8n cron — щоб не падало з API           |
| Захардкодити секрети в n8n workflows           | n8n credentials store + env vars                          |
| Автоматизувати раніше за PMF                   | Вручну → виміряй больові точки → потім автоматизуй        |
| OpenClaw на проді з prod credentials у dev     | Dev OpenClaw → staging stack only                         |
| Запам'ятовувати алерти в голові                | Все що повторюється > 2 разів — у n8n                     |
| Залишати OpenClaw без guardrails               | Always-allow tools = read-only. Mutations — за approval.  |

---

## 10. Quick wins (можна зробити цього тижня)

```
Понеділок:
  □ Створити Telegram канал #sergeant-alerts + topics
  □ Створити @BotFather бот, взяти BOT_TOKEN
  □ Додати GitHub repo secret TELEGRAM_BOT_TOKEN

Вівторок:
  □ Розгорнути n8n на Railway (~30 хв)
  □ Перший workflow: Stripe webhook → Telegram

Середа:
  □ Додати workflow: Sentry → Telegram
  □ Додати workflow: GitHub Actions failed → Telegram

Четвер:
  □ Налаштувати OpenClaw (Docker або hosted Claude Project)
  □ Daily morning brief workflow

П'ятниця:
  □ GitHub Project "Sergeant Operations" — створити views
  □ Тестова прогонка тижневого ритуалу

Субота-Неділя:
  □ Документувати у Notion / GitHub Wiki
  □ Перший weekly report від OpenClaw
```

---

## 11. Вартість operations stack

| Компонент                 | Вартість/міс       |
| ------------------------- | ------------------ |
| n8n (Railway)             | $3–5               |
| OpenClaw (Railway)        | $3–5               |
| OpenClaw LLM API          | $20–50             |
| Telegram bot              | 🟢 Free            |
| Grafana Cloud (free tier) | 🟢 Free            |
| GitHub Projects           | 🟢 Free (з GitHub) |
| UptimeRobot               | 🟢 Free            |
| **TOTAL**                 | **~$26–60/міс**    |

Окупиться вже з першими 30 Pro-підписниками (₴99 × 30 ≈ $75/міс).

---

## Pointers

- Каталог сервісів і фази впровадження → [03-services-and-toolstack.md](./03-services-and-toolstack.md).
- Метрики, алерти, incident response → [04-launch-readiness.md §3](./04-launch-readiness.md#3-operations-support-monitoring-incidents).
- Контент-плани і канали (що автоматизувати в content pipeline) → [02-go-to-market.md](./02-go-to-market.md).
- Billing edge cases (що n8n обробляє) → [04-launch-readiness.md §2.1](./04-launch-readiness.md#21-billing-edge-cases).
