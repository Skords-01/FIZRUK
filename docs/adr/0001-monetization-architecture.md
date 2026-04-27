# ADR-0001: Monetization architecture (10 рішень перед стартом)

- **Status:** proposed
- **Date:** 2026-04-27
- **Reviewers:** @Skords-01
- **Supersedes:** —
- **Related:**
  - [`docs/launch/01-monetization-and-pricing.md`](../launch/01-monetization-and-pricing.md) — бізнес-модель, тіри, ціни.
  - [`docs/launch/06-monetization-architecture.md`](../launch/06-monetization-architecture.md) — технічний скелетон v2 (PR-розбивка, schema, risk register).

---

## 0. TL;DR

Цей ADR фіксує **10 архітектурних рішень**, які повинні бути затверджені **до старту PR-M.1**. Без цього ADR код не починаємо: ці питання випливуть посеред PR-M.7 (Stripe webhook) як суперечливі і доведеться переробляти.

| #    | Тема                          | Decision (коротко)                                                                 |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------- |
| 1.1  | Payment provider              | Stripe primary; LiqPay — Phase 2 (поза MVP)                                        |
| 1.2  | Schema design                 | Single-row-per-user `subscriptions`; audit trail у follow-up `subscription_events` |
| 1.3  | Plan-cache TTL + invalidation | RQ `staleTime: 60s`; server LRU `ttl: 300s` + Postgres NOTIFY → SSE                |
| 1.4  | Grandfather policy            | `created_at < 2026-05-01` → `legacy_grace` + 90 днів trial-Pro                     |
| 1.5  | Trial для нових юзерів        | 14 днів Pro, без payment method, авто-deграда у free                               |
| 1.6  | AI-ліміт для free             | 5 chat msg/day, 3 photo/day; ENV-driven, A/B-тестабельно без міграції              |
| 1.7  | requireAiQuota ↔ requirePlan  | requireAiQuota читає план; requirePlan — лише на не-AI gates                       |
| 1.8  | Webhook event-id retention    | 90 днів у `stripe_webhook_events`; cron-purge у follow-up                          |
| 1.9  | Currency                      | UAH primary, USD secondary через Stripe Multi-currency; на MVP — UAH only          |
| 1.10 | Tax handling                  | Stripe Tax automatic + ФОП на 3-й групі (operations, не код)                       |

---

## ADR-1.1 — Payment provider: Stripe primary, LiqPay Phase 2

### Status

accepted (proposed → потребує merge цього PR-у).

### Context

Sergeant стартує в Україні. Для українських юзерів існує два реалістичні варіанти приймання платежів:

1. **Stripe** — глобальний, добре документований, повний SDK, customer portal, automatic tax, dispute management. Stripe на 2024-04 офіційно **не доступний для українських ФОП** як seller-account, але доступний для **Wise/Cyprus/Estonia** entity-структур, які багато локальних founder-ів вже використовують. Комісія: 2.9% + €0.25 для EU карт.
2. **LiqPay** (Privat24) — український, ФОП-friendly, нижча комісія (1.5–2.7%), але обмежений SDK, поганий webhook reliability, відсутній customer portal — треба будувати UI самим.

### Decision

**Stripe — primary provider.** LiqPay — Phase 2 (після MVP) як вторинний для українських юзерів, які не хочуть платити Stripe-комісію в EUR/USD.

### Consequences

**Позитивні:**

- Готовий Customer Portal — юзер сам керує підпискою, без нашого UI.
- Stripe Tax automatic — РСТ/VAT для EU, NDS для UA — Stripe рахує сам.
- Idempotent webhooks по `event.id` — пишемо один endpoint, retry-safe.
- Stripe має тестовий mode + Stripe CLI для локальної webhook-симуляції.

**Негативні:**

- Юридична структура: треба Wise / Estonian e-Residency / Cyprus LLC. На MVP — допустимо, бо вже є.
- Комісія в EUR при отриманні в UAH — додатковий FX spread ~1.5%.
- Stripe не приймає українські картки 4149 BIN — більшість юзерів платить картками інших банків. Acceptable на MVP (Privat domestic UA-cards залишаємо для LiqPay Phase 2).

### Alternatives considered

- **LiqPay primary**: відкинуто через відсутність Customer Portal, обмеженою webhook-документацією, складнішою interpretation refunds.
- **Mono Acquiring**: Mono pay-in API готовий тільки для b2c-merchants з фіз. товарами; для SaaS-підписок офіційного контракту немає (на 2026-04). Phase 3.
- **Paddle**: closed merchant-of-record, всі ризики на них, але комісія 5%+ і слабша tax-coverage у країнах, де ми будемо рости (UA, PL, EN).

---

## ADR-1.2 — Schema design: single-row-per-user

### Status

accepted.

### Context

Для зберігання підписок є два архітектурні патерни:

1. **Single-row-per-user**: одна `subscriptions` row на юзера, поточний стан перезаписується. Простіше query, простіше middleware (`SELECT * FROM subscriptions WHERE user_id = $1`).
2. **Append-only event log**: кожна зміна підписки — новий рядок (`subscription_events`); поточний стан — projection. Складніше, але повна історія аудиту "out of the box".

Для MVP нам потрібна швидка `getUserPlan(userId)`-перевірка на кожному API-запиті. Append-only вимагає або materialized view, або снапшот-таблиці — додаткова складність.

### Decision

**Single-row-per-user `subscriptions` table.** Аудит-трейл — окрема `subscription_events` table як **follow-up Phase 7** (поза MVP), що append-only-логує кожен webhook-event.

Schema див. [`docs/launch/06-monetization-architecture.md` §3.1](../launch/06-monetization-architecture.md#31-migration-009--subscriptions-правки-v1).

### Consequences

**Позитивні:**

- `getUserPlan(userId)` — single PK lookup, cacheable.
- Просто читати у Studio / psql без projection.
- Webhook handler upsert-ить one row замість append.

**Негативні:**

- Втрата історії підписок — після merge-у з Phase-7 events table, історію до того часу неможливо відновити (тільки те, що Stripe пам'ятає).
- Складніше робити cohort-аналіз "коли юзер X конвертнувся в Pro, скільки разів був past_due, ...". Mitigation: `stripe_webhook_events` таблиця зберігає raw events 90 днів.

### Alternatives considered

- **Append-only `subscription_events` зразу:** відкинуто через додаткову складність projection layer. Plan-перевірка на кожному запиті стає latest-event lookup замість PK-lookup — gain не виправдовує MVP-час.
- **Stripe як source of truth, без локального дублювання:** відкинуто, бо кожен API-запит з `requirePlan()` робив би 1 RTT до Stripe → +200ms latency. Кешувати без локальної БД — складніше.

---

## ADR-1.3 — Plan-cache TTL + invalidation

### Status

accepted.

### Context

`requirePlan()` middleware викликається на кожному захищеному ендпоінті. Без кешу — `SELECT FROM subscriptions` на кожен запит. З кешом — потрібна стратегія invalidation коли план змінюється (cancel, upgrade, past_due → active).

Stale plan = серйозний bug:

- Канселед Pro-юзер з cache-hit на 5 хвилин → користується Pro безкоштовно.
- Свіжий-апгрейднутий free → бачить paywall ще 5 хвилин.

### Decision

**Двошаровий кеш з NOTIFY-based invalidation:**

1. **Server LRU cache:** `lru-cache` з `ttl: 300s`, `max: 5_000`. Очищується миттєво через Postgres NOTIFY-trigger `subscription_changed` → server `LISTEN`-loop робить `planCache.delete(userId)`.
2. **Client RQ cache:** `staleTime: 60s`, `refetchOnWindowFocus: true`. Серверний SSE-stream `/api/me/plan-stream` емітить `updated`-event → клієнт `queryClient.invalidateQueries(billingKeys.plan())`.

Trigger див. [`docs/launch/06-monetization-architecture.md` §3.1](../launch/06-monetization-architecture.md#31-migration-009--subscriptions-правки-v1).

### Consequences

**Позитивні:**

- Latency на захищеному ендпоінті: ~0.1ms cache hit замість 2-5ms DB query.
- Stale-window: < 1s після webhook-у (NOTIFY → cache delete) у нормальних умовах.
- Без NOTIFY — fallback `staleTime` 60s гарантує eventual consistency.

**Негативні:**

- Memory cost: 5K юзерів × ~200 bytes = ~1MB per server instance. Прийнятно.
- Якщо Postgres LISTEN connection падає — cache не invalidate-иться. Mitigation: `LISTEN` reconnect-loop + Sentry alert на `pg_listen_disconnect_total` рост.
- SSE з'єднання — extra resource per connected client. На MVP < 1K concurrent — ok. На scale (Phase 8) — можливо WebSocket upgrade.

### Alternatives considered

- **Redis pub/sub:** додає інфраструктурну залежність на MVP. Postgres NOTIFY — вбудоване, безкоштовне, достатньо для < 100 webhook/min.
- **TTL-only без invalidation:** відкинуто через критичність stale Pro / canceled.
- **Polling кожні 30s:** відкинуто — спам-load на сервер при scale.

---

## ADR-1.4 — Grandfather policy: 90 днів trial-Pro для існуючих юзерів

### Status

accepted.

### Context

CloudSync, AI brifing, photo-analyze — фічі, які зараз **доступні безкоштовно** на проді. Якщо PR-M.10 викочує paywall без попередження, у юзерів зникнуть фічі, якими вони користуються — гарантований churn + соцмережний bash.

### Decision

Усі юзери з `created_at < 2026-05-01` отримують **`legacy_grace` status** на 90 днів (`grace_until = '2026-08-01'`). У цей період `effectivePlan()` повертає `pro` незалежно від `plan` поля.

Реалізація:

- Migration `011_grandfather_existing_users.sql` (data-migration, INSERT + WHERE NOT EXISTS guard).
- Email + in-app banner за 30 / 14 / 3 / 1 день до `grace_until`.
- Після `grace_until` юзер автоматично переходить у `free` з 14-day Pro trial extension (один раз).

### Consequences

**Позитивні:**

- Існуючі юзери мають час адаптуватись.
- Можна спостерігати free-to-paid conversion **виключно для grandfathered cohort** як baseline для launch.
- Soft landing для community.

**Негативні:**

- Перші 90 днів monetization runtime — нульовий revenue від існуючих юзерів. Acceptable на MVP, бо нові юзери (post-2026-05-01) повноцінно paying.
- Deploy migration 011 ПІСЛЯ migration 009 (sequential — AGENTS.md rule #4) → треба окремий PR-M.4.

### Alternatives considered

- **Permanent free-Pro для legacy:** зруйнує economics — ~80% nullable юзерів отримують Pro назавжди. Відкинуто.
- **Грейс 30 днів:** замало — багато юзерів логінятся раз на місяць, можуть пропустити email-нотифікацію.
- **Грейс 180 днів:** дорого. 90 днів — PMF-стандарт для freemium-перехідних періодів.

---

## ADR-1.5 — Trial для нових юзерів: 14 днів Pro без payment method

### Status

accepted.

### Context

Onboarding-конверсія для freemium-продуктів значно вища при trial-flow ([Lenny Rachitsky 2024](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion): 8-25% trial-to-paid vs 2-5% freemium-to-paid). Для нашого продукту, де реальна цінність розкривається після 2-3 тижнів використання (звички, фінансові патерни), critical зрозуміти продукт повністю.

### Decision

**14 днів Pro trial при реєстрації, без payment method.** По закінченню → free + paywall на Pro-features.

- `subscriptions.status = 'trialing'`, `current_period_end = NOW() + 14 days`.
- Cron щоночі (`scripts/expire-trials.mjs`) переводить `expired` trial-и в `free`.
- Користувач може upgrade-нути в будь-який момент trial → `active` Pro.

### Consequences

**Позитивні:**

- Низький friction onboarding — без payment-card форми.
- Конверсія значно вища (історично 8-25% vs 2-5% freemium).
- Onboarding wizard може показувати реальні Pro-фічі без paywall-блоків.

**Негативні:**

- Можливі **trial-abuse юзери** (нові акаунти кожні 14 днів). Mitigation: один trial per email + per IP per device (через Better Auth fingerprint). На MVP — толеруємо, на Phase 7 — anti-fraud.
- Free-tier фічі стають "downgrade-experience" після trial. Mitigation: до закінчення trial — banner з конкретною ціною і CTA.

### Alternatives considered

- **Trial з payment method (ASAP charge):** вище 2× конверсія, але friction в onboarding fail-ить activation rate. Phase 7 — A/B-test.
- **7 днів trial:** замало щоб освоїти 4 модулі (Finyk + Fizruk + Routine + Nutrition).
- **30 днів trial:** дорожче. 14 — золота середина для productivity-apps (Notion, ClickUp, Todoist).

---

## ADR-1.6 — AI-ліміт для free: 5 chat / 3 photo

### Status

accepted (revertable без міграції — ENV-driven).

### Context

`requireAiQuota` зараз тримає liмит 120 chat/day per user (`AI_DAILY_USER_LIMIT`). Після monetization — free має різний liмит від Pro. Питання: який саме liмит для free.

### Decision

**Free тіr:**

- 5 chat-повідомлень / day
- 3 photo-аналізів / day
- 0 AI-brifing-ів / day (повністю за paywall)
- 0 day-summary-ів / day (повністю за paywall)

**Pro тіr:** unlimited (null), але soft warning у Sentry якщо single user > 1000 msg/day (потенційно abuse або bot).

Числа в `ENV-vars`: `PLAN_FREE_AI_CHAT_PER_DAY`, `PLAN_FREE_AI_PHOTO_PER_DAY` — **A/B-test без міграції**.

### Consequences

**Позитивні:**

- 5/3 ліміти достатньо щоб юзер відчув цінність AI, але не закрив daily-need.
- Banner "5/5 повідомлень. Перейди на Pro" — сильний conversion-trigger.
- ENV-driven → можемо A/B-test 3/5/10 і дивитись `free_to_paid_conversion_rate` без deploy-cycle.

**Негативні:**

- 5 msg/day може бути замало для power-users → frustration і churn замість conversion. Mitigation: показувати banner з конкретною ціною і CTA (не помилку 429).
- Photo-analyze 3/day — дорого для юзера, який реально юзає nutrition daily. Mitigation: explicit "lock icon" на 4-му використанні з roadmap CTA.

### Alternatives considered

- **3 chat/day:** замало для PMF — юзер не встигне зрозуміти продукт.
- **10 chat/day:** забагато — 90% free-юзерів вкладуться у liмит, conversion не trigger-иться.
- **Token-based liмит:** складніше комунікувати. "5 повідомлень" — простіше у банері.

---

## ADR-1.7 — Coordination з existing `requireAiQuota`

### Status

accepted.

### Context

`apps/server/src/modules/aiQuota.ts` уже має `effectiveLimits()` що читає `AI_DAILY_USER_LIMIT` з ENV. Питання: як інтегрувати monetization без дублювання middleware.

### Decision

`requireAiQuota` стає **plan-aware**:

```ts
// apps/server/src/modules/aiQuota.ts (PR-M.6)
export async function effectiveLimits(userId: string | null): Promise<Limits> {
  if (!userId) return ANONYMOUS_LIMITS;
  const sub = await getUserPlan(userId); // ← з planCache
  const eff = effectivePlan(sub);
  return eff === "pro" ? PRO_LIMITS : FREE_LIMITS;
}
```

- `requirePlan(feature)` — лише на **не-AI feature gates** (cloudSync, exportCsvPdf, weekComparison...).
- `requireAiQuota` залишається на AI-ендпоінтах (`/api/chat`, `/api/coach`, `/api/photo-analyze`) і сам читає план.
- **Не додаємо `requirePlan("aiChatPerDay")` поверх `requireAiQuota`** — це дублювання.

### Consequences

**Позитивні:**

- DRY — одна точка enforcement на AI-ендпоінти.
- Мінімум LOC у PR-M.6 (~200 LOC, лише refactor `effectiveLimits`).
- Backwards-compat — старі snapshot-тести `effectiveLimits` залишаються валідними після adapter-у.

**Негативні:**

- `requireAiQuota` тепер залежить від `getUserPlan` → tighter coupling. Mitigation: інтерфейс `PlanProvider` для test-injection.
- Cache-invalidation помилка на план може silently повернути старий liмит. Mitigation: `plan_cache_hit_total{outcome}` метрика з alert на rate stale.

### Alternatives considered

- **Дублювати liмит-перевірку в requirePlan:** відкинуто, два middleware на одному ендпоінті — складно і легко розіграти.
- **Зробити requireAiQuota dumb (фіксований liмит) + requirePlan smart:** підвищує latency через 2 окремі DB-checks на запит.

---

## ADR-1.8 — Webhook event-id retention: 90 днів

### Status

accepted.

### Context

`stripe_webhook_events` таблиця гарантує idempotency через `event_id PRIMARY KEY`. Питання: як довго тримати rows. Stripe гарантує retry up to 3 days. Але ми використовуємо table також для:

1. Audit-trail (raw event payload).
2. Debugging webhook-проблем.
3. Replay (якщо handler був buggy і потрібно переграти події).

### Decision

**Retention: 90 днів.** Cron щоночі (`scripts/purge-stripe-webhooks.mjs`) видаляє `WHERE processed_at < NOW() - INTERVAL '90 days'`.

Cron-script — Phase 7 (поза MVP). На MVP таблиця росте необмежено (~10K events / місяць max — manageable).

### Consequences

**Позитивні:**

- 90 днів покриває quarterly audit + дебаг більшості inci.
- Idempotency-window далеко за Stripe-retry-window (3 days) — гарантовано safe.
- Phase 7 cron — простий `DELETE` без ризику розгону БД.

**Негативні:**

- При scale (~1M events/year) → ~250K rows × ~5KB JSON = ~1.25GB. Postgres з цим легко справиться.
- Якщо знадобиться > 90 днів audit (наприклад, dispute) — raw payload втрачено. Mitigation: для dispute-events окремий `disputes` table з infinite retention.

### Alternatives considered

- **Infinite retention:** прийнятно для MVP, відкладено до Phase 7. Цей ADR закладає 90 днів proactively.
- **30 днів:** замало для quarterly audit cycles.
- **365 днів:** надлишково; всі важливі дані вже є в `subscriptions` + Stripe Dashboard.

---

## ADR-1.9 — Currency: UAH primary, USD secondary через Stripe Multi-currency

### Status

accepted.

### Context

Sergeant запускається в Україні. Ціни в `01-monetization-and-pricing.md` зафіксовані в UAH (₴99/міс, ₴799/рік). Для майбутнього (Польща, англомовні) потрібна готовність до multi-currency.

### Decision

**MVP: UAH only.** Stripe Price-ID-и в UAH (`STRIPE_PRICE_ID_PRO_MONTHLY` = UAH 99/month).

**Phase 7 (post-launch):** додати USD prices (через Stripe Multi-currency):

- Stripe Price з `currency_options: { uah: ..., usd: ..., eur: ... }`.
- Browser-locale → preferred currency (UA → UAH, PL → PLN, \_ → USD default).
- UI-toggle для override.

### Consequences

**Позитивні:**

- Stripe Multi-currency готовий до використання — без міграції в Phase 7.
- На MVP UI рендерить тільки UAH — простіше.

**Негативні:**

- Foreigners на MVP бачать UAH-ціну — friction. Acceptable для українського-target launch.
- FX-spread 1.5% на конверсії UAH → EUR (Stripe's payout currency). Закладено у економіку.

### Alternatives considered

- **USD primary:** змінює таргет-аудиторію на global. Поза scope MVP launch (UA-focus).
- **EUR primary:** non-friendly UAH-юзерам, які бачать вартість через Privat-курс.

---

## ADR-1.10 — Tax handling: Stripe Tax + ФОП 3-я група

### Status

accepted (operations side, не код).

### Context

Sergeant продаватиме SaaS-підписки. Юридично:

- Українським юзерам — без VAT (ФОП 3-ї групи на 5% єдиному податку).
- EU-юзерам — Stripe Tax automatic (VAT calculation).
- US-юзерам — sales tax automatic через Stripe Tax.
- UK-юзерам — VAT 20% automatic через Stripe Tax.

### Decision

**Stripe Tax automatic** на product level + **ФОП 3-я група** для українських продажів. Stripe рахує tax в інвойсі, ФОП-облік — окремий контур (operations).

ENV: `STRIPE_TAX_ENABLED=true`. На MVP — не спалаха-вмикаємо на staging для тестування.

### Consequences

**Позитивні:**

- Stripe сам рахує tax для всіх не-UA juris — нульовий compliance burden.
- ФОП-сторона — стандартний книгу обліку через Privat24-API (не наш код).
- Customer Portal видає juridically-valid invoices автоматично.

**Негативні:**

- Stripe Tax — extra fee 0.5% від суми продажу. Acceptable.
- Налаштування Stripe Tax вимагає registration в кожній jurisdiction (operations, не код).

### Alternatives considered

- **Manual tax:** дорого по часу, помилкам, compliance-ризику. Відкинуто.
- **Paddle merchant-of-record:** Paddle бере на себе compliance, але комісія 5%+ — економічно гірше.

---

## Конфлікти і trade-offs

Коли реалізація PR-M.X виявляє конфлікт з ADR — **спочатку оновлюємо ADR через окремий PR**, потім продовжуємо код. Не оминаємо ADR через `// TODO`.

Якщо два ADR конфліктують між собою (наприклад, ADR-1.3 NOTIFY vs ADR-1.5 trial-cron) — пишемо новий ADR що superseds-ить обидва і пояснює resolution.

---

## Implementation tracker

| PR      | Реалізує ADR               | Статус   |
| ------- | -------------------------- | -------- |
| PR-M.0  | ADR-1.1 ... ADR-1.10       | (цей PR) |
| PR-M.1  | ADR-1.2                    | pending  |
| PR-M.2  | ADR-1.2                    | pending  |
| PR-M.3  | ADR-1.3                    | pending  |
| PR-M.4  | ADR-1.4                    | pending  |
| PR-M.5  | ADR-1.7                    | pending  |
| PR-M.6  | ADR-1.6, ADR-1.7           | pending  |
| PR-M.7  | ADR-1.1, ADR-1.8, ADR-1.10 | pending  |
| PR-M.8  | ADR-1.5                    | pending  |
| PR-M.9  | ADR-1.9                    | pending  |
| PR-M.10 | ADR-1.5 (PAYWALL_ENABLED)  | pending  |

---

## Open questions (для подальших ADR)

- ADR-0002 (TBD): plan-cache eviction strategy на multi-instance deploy (Railway scales horizontally?).
- ADR-0003 (TBD): refund / dispute handling — манально через Stripe Dashboard чи через app-side flow?
- ADR-0004 (TBD): family / team plans — shared subscription чи per-seat? (Phase 8.)
- ADR-0005 (TBD): referral / promo-code system. (Phase 8.)
