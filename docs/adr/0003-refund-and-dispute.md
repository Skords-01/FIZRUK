# ADR-0003: Refund and dispute handling

- **Status:** proposed
- **Date:** 2026-04-27
- **Last reviewed:** 2026-04-27 by @Skords-01
- **Reviewers:** @Skords-01
- **Supersedes:** —
- **Related:**
  - [ADR-0001](./0001-monetization-architecture.md) §1.11 — cancellation flow (refund винесений сюди як open question).
  - [ADR-0001](./0001-monetization-architecture.md) §1.16 — billing observability (refund-rate / dispute-rate alerts).
  - [`apps/server/src/modules/billing/`](../../apps/server/src/modules/billing/) — handler-и Stripe webhook events.
  - [`docs/launch/06-monetization-architecture.md`](../launch/06-monetization-architecture.md) — risk register.
  - Stripe Disputes API: <https://stripe.com/docs/disputes>.

---

## 0. TL;DR

Закриває open question з ADR-1.11. **Default-policy: no refund поза automatic-flow** (cancel — pro-rated grace до `current_period_end`, без refund). Винятки — два:

1. **Customer-initiated refund** (e.g., помилкова purchase, bug у нашому checkout) — manual approve через Stripe Dashboard, обмежено: ≤ 14 днів від charge, ≤ 1 раз на user-account за рік. Логуємо у `subscription_events`.
2. **Charge dispute** (chargeback від банку) — Stripe-managed, ми не contest-имо для Pro-MVP (LTV < cost-of-evidence). Дотримуємось dispute-handling SOP.

UI ніколи не оголошує «refunds available» — це anti-promise. Telegram-support флоу тільки.

| Sub-decision | Тема                               | Decision (коротко)                                                                      |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------- |
| 3.1          | Default refund policy              | Cancel-only-grace; no refunds by default                                                |
| 3.2          | Customer-initiated refund          | Manual; ≤14 днів, ≤1×/year; via Stripe Dashboard; updated `subscriptions.status`        |
| 3.3          | Charge dispute (chargeback) flow   | Не contest-имо у MVP; auto-cancel sub; ban на re-subscribe 90 днів                      |
| 3.4          | Webhook events handled             | `charge.refunded`, `charge.refund.updated`, `charge.dispute.*`                          |
| 3.5          | UI / customer-facing communication | Banner про refund — не показуємо. FAQ в Telegram-bot-і                                  |
| 3.6          | Audit trail                        | Кожен refund/dispute → row у `subscription_events` (Phase 7) або `manual_refunds` table |

---

## Context

ADR-1.11 закриває cancellation, але **explicitly опускає refund-flow**: «refund / dispute handling — окремий ADR». Без зафіксованої політики:

1. Перший support-ticket про «верніть гроші, я не зрозумів що це підписка» прийде в перші 30 днів post-launch — не буде SOP, кожен раз імпровізуємо.
2. Stripe disputes мають hard-deadline (зазвичай 7-10 днів від `charge.dispute.created`). Якщо не маємо runbook-у — пропускаємо deadline → automatic loss + $15 dispute fee.
3. Анти-fraud абуз: один user робить 5 sub-cycles, потім chargeback-ить усі — Stripe ban на наш account.
4. UA-cardholders (BIN 4149, 5169) історично мають вищий dispute-rate (~0.5-1%) ніж US-середнє. Без proactive handling — ризик потрапити у Stripe «high-risk» bucket з 4.4% reserve.

**Критерії ухвалення рішення:**

- LTV per Pro-user (target Phase 0) ≈ 6-12 місяців × 99 ₴ = 594-1188 ₴.
- Cost-of-evidence на dispute (час collect-нути logs, написати rebuttal) ≈ 30-60 хв людино-часу.
- Stripe success-rate на disputes без strong evidence ≈ 30-40%.
- Висновок: contest-ити dispute economically не виправдовується для Pro-tier.

## Decision

### ADR-3.1 — Default refund policy: cancel-only-grace

**Default-flow на cancel: ADR-1.11 grace period (Pro до `current_period_end`), no monetary refund.**

UA-споживацьке право (Закон «Про захист прав споживачів», ст. 9) дозволяє відмову від digital-послуги в 14-денний строк **за умови, що послуга ще не спожита**. Коли user активно chat-ив з ai-coach — послуга вважається спожитою, refund не обов'язковий. Phrase у ToS: «Підписка автоматично продовжується. Скасування зупиняє наступний charge; вже сплачений період залишається активним до його завершення.»

Decision rationale:

- Industry-standard: Spotify, Netflix, Notion — usage-based, no refunds by default.
- Зменшує abuse: «оплатив на 1 день, скористався, refund» — мінімальний LTV.
- ToS-clarity знижує dispute-rate (dispute reason `subscription_canceled` починає з ToS-аналізу).

### ADR-3.2 — Customer-initiated refund (винятки)

**Дозволено в окремих ситуаціях; завжди manual через Stripe Dashboard.**

Сценарії, коли refund **виконуємо**:

1. **Bug у нашому checkout** (double-charge, wrong currency, charged after immediate cancel < 5 хв). Full refund, no questions.
2. **Користувач помилково оформив yearly замість monthly** і написав support-у в перші 14 днів (per UA-споживацьке право, при «майже-неспоживанні»: ≤2 днів usage). Pro-rated refund yearly→monthly.
3. **Service unavailability >24h за останні 7 днів** з документованим Sentry-incident. Pro-rated за days-of-outage.
4. **Goodwill** (≤1 раз на user-account за рік): user has compelling reason, accepts as last-resort gesture.

**Технічний flow:**

1. Support-ticket приходить у Telegram (`@sergeantsupport_bot`, поки manual). Operator перевіряє sценарій.
2. Operator робить refund через Stripe Dashboard (UI-only; не з нашого API). Reason-code: `requested_by_customer`.
3. Stripe webhook `charge.refunded` приходить → handler:
   - Записує row у `manual_refunds` (PR-M.17 створює table; до Phase 7 — `subscription_events` ще немає, тому окрема table).
   - Якщо `refund.amount === charge.amount` (full refund) → `subscriptions.status='canceled'`, `plan='free'`, NOTIFY-trigger інвалідує cache (ADR-1.3).
   - Якщо partial refund (e.g., yearly→monthly delta) → не міняємо status, але emit Sentry-breadcrumb для audit.
   - Email-notification «Ми повернули X UAH» (через transactional email, той самий cron з ADR-1.12).
4. Refund-rate metric (`refund_initiated_total{reason}` з ADR-1.16) бамп-иться.

**Quota:**

- ≤14 днів від `charge.created`: hard limit (Stripe technically allows up to 6 months, але ми self-impose).
- ≤1 refund на user-account за rolling-365-day window (anti-abuse).
- Перевірка — manual в operator-checklist; database-enforce додамо у Phase 1, якщо побачимо abuse.

### ADR-3.3 — Charge dispute (chargeback) flow

**MVP policy: не contest-имо, але реагуємо процесно.**

Коли Stripe приходить `charge.dispute.created`:

1. **Webhook handler:**
   - Запис у `subscription_events` (або `disputes` table до Phase 7).
   - `subscriptions.status='canceled'`, `plan='free'`, NOTIFY-trigger інвалідує cache.
   - User flag-ується `disputes_history.banned_until = NOW() + INTERVAL '90 days'` — у цей період re-subscribe blocked при checkout-create.
   - Sentry-alert до operator-у. Sentry-event severity = warning.
2. **Operator response (24h SLA):**
   - Перевіряє Stripe Dashboard на reason_code.
   - Якщо `fraudulent` (most common) — accept, не contest. Stripe withdraws funds + $15 fee.
   - Якщо `subscription_canceled` або `product_unacceptable` — accept за замовчуванням (per ADR-3.1 ToS, але Stripe іноді overrides).
   - Якщо `credit_not_processed` (юзер вимагав refund, ми не дали) — review individually; може стати тригером для ADR-3.2-flow goodwill.
3. **Не submit-имо evidence** — economic-rationale у Context. Винятки: serial fraud-pattern (5+ disputes from one IP/email-domain) → operator може submit fraud-evidence.

**Re-subscribe ban (90 днів):**

- Захищає від повторних cycle-abuse.
- Реалізується middleware-перевіркою `requirePlan` + checkout-create endpoint.
- Через 90 днів — auto-clear flag.
- User знає? Так, у Telegram-bot-і operator повідомляє після dispute-resolution.

### ADR-3.4 — Webhook events handled

`apps/server/src/modules/billing/webhook.ts` має обробляти:

| Event                             | Action                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `charge.refunded`                 | INSERT manual_refunds; UPDATE subscriptions if full; emit metric.                                                      |
| `charge.refund.updated`           | UPDATE manual_refunds (e.g., status changed to `failed`).                                                              |
| `charge.refund.failed`            | Sentry-error; operator manually resolves.                                                                              |
| `charge.dispute.created`          | INSERT disputes; UPDATE subscriptions (cancel + ban); operator alert.                                                  |
| `charge.dispute.updated`          | UPDATE disputes (status changed: `under_review` → `won` / `lost`).                                                     |
| `charge.dispute.closed`           | Update final disposition; if `lost` — write off; if `won` (rare for us) — clear ban, optionally re-instate sub manual. |
| `charge.dispute.funds_withdrawn`  | Trigger Sentry-warning: balance impact.                                                                                |
| `charge.dispute.funds_reinstated` | Trigger Sentry-info: rare.                                                                                             |

Idempotency — через ADR-1.8 `event.id PRIMARY KEY` mechanism. Snapshot-tests за ADR-1.14.

### ADR-3.5 — UI / customer-facing communication

**Anti-promise rule:** ніде в UI не показуємо «refunds available», «100% money-back guarantee», «cancel anytime for full refund». Це нав'язує expectation, який ми не виконуємо.

**Showed:**

- Settings → Subscription → «Скасувати підписку» button → confirmation modal: «Pro-функції залишаться до {date}. Подальші платежі не списуватимуться. Якщо є проблеми, напишіть в [Telegram-support]».
- ToS § «Скасування і повернення»: explicit статтю про grace-period і відсутність auto-refund.
- FAQ в Telegram-bot-і: 3-4 типові питання («Чи можу повернути гроші?», «Я не використовував підписку — поверніть»).

**Не показуємо:**

- Refund-button в UI.
- «Money-back guarantee» badge на pricing-page.
- Auto-refund flow при cancel ≤24h після purchase.

### ADR-3.6 — Audit trail

До Phase 7 (коли з'явиться `subscription_events` table з ADR-1.2) — окремі manual tables:

```sql
-- PR-M.17 створює:
CREATE TABLE manual_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  stripe_charge_id TEXT NOT NULL,
  stripe_refund_id TEXT NOT NULL UNIQUE,
  amount_minor INT NOT NULL,         -- in kopecks
  currency TEXT NOT NULL,            -- 'UAH'
  reason TEXT NOT NULL,              -- enum: 'bug' | 'plan_change' | 'outage' | 'goodwill'
  operator TEXT NOT NULL,            -- @-handle
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  stripe_charge_id TEXT NOT NULL,
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  reason_code TEXT NOT NULL,         -- e.g., 'fraudulent', 'subscription_canceled'
  amount_minor INT NOT NULL,
  status TEXT NOT NULL,              -- 'warning_needs_response' | 'under_review' | 'won' | 'lost'
  outcome TEXT,                      -- final disposition
  evidence_submitted BOOLEAN NOT NULL DEFAULT false,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_disputes_user_banned ON disputes(user_id, banned_until)
  WHERE banned_until IS NOT NULL AND banned_until > NOW();
```

Phase 7 — мігруємо в `subscription_events` через uniform schema; ці tables стають view-ами або deprecated. Decision відкладено до Phase 7.

## Consequences

**Позитивні:**

- Чіткий SOP для operator-у — менше ad-hoc decisions.
- Default no-refund policy → нижчий abuse-risk.
- ToS-aligned UI → нижчий dispute-rate (юзери не очікують того, що ми не обіцяли).
- Observability (ADR-1.16) робить refund/dispute trends видимими — bad-actor patterns deтектуються рано.
- 90-day ban на dispute → захищаємось від цикл-абузу.

**Негативні:**

- «No refunds» — friction у UX-наративі. Можемо втратити 1-2% conversion на pricing-page (юзери, які купують saas-and-cancel-immediately).
- Manual operator-flow на refund-approve — не масштабується після ~50 tickets/тиждень. Triggers нову ADR-у (auto-approve goodwill-refund з обмеженнями).
- Без contest-у dispute-rate може здаватися високим Stripe-у. Mitigation: моніторимо `dispute_created_total{reason_code}` — якщо > 0.5%/місяць, переоцінюємо.
- UA-споживацьке право може бути interpret-ed на нашу шкоду в окремих court-cases. Acceptable для MVP — потім консультуємось з юристом.

## Alternatives considered

- **«100% money-back guarantee» в перші 30 днів:** агресивний marketing, але дорого — типові SaaS-фірми бачать 2-5% churn-and-refund в перший місяць. Для Pro at 99 ₴/місяць це знищує LTV. Відкинуто.
- **Auto-refund на cancel протягом 24h після purchase:** chargeback risk нижчий (~0.1-0.2% дельта), але abuse risk вищий (один cycle 99 ₴ × 100 trial-and-refund = -9900 ₴). Відкинуто до Phase 1, коли є дані.
- **Contest всі disputes:** $15 fee × success-rate 30% = expected -$10.50 на кожен (втрачений) dispute. На 50 disputes/рік це -$525. Acceptable втрата, не варто 50 операт-годин.
- **Stripe Adaptive Acceptance / Chargeback Protection:** Stripe-product, але cost ~0.4% всіх charges. На 50K ₴ MRR це -200 ₴/місяць. Проти 2-3 disputes/місяць × $15 = ~$45 = ~1700 ₴ — Adaptive economically виграшний, але відкладаємо до Phase 1 коли мaємо baseline-data.

## Open questions

1. **EU/UK refund-policy.** GDPR + EU Consumer Rights Directive — 14-day cooling-off period з право на full refund навіть для used digital services (якщо не explicit waiver). При expansion (Phase 7) потрібен окремий ADR з EU-flow.
2. **Pre-emptive «too good to be true» banner.** Чи варто показувати banner «Скасування — анітайм без refund-у. Це не пастка» при checkout? UX-test потрібен. Поки — refused (anti-friction).
3. **Goodwill-refund ліміт database-enforced.** Зараз — operator-checklist; database `manual_refunds` row count за year-window check. Implementation — Phase 1, якщо ≥3 cases на тиждень.

## Implementation tracker

| PR      | Реалізує ADR | Статус  |
| ------- | ------------ | ------- |
| PR-M.17 | ADR-3.1—3.6  | pending |

Рев-аліduє цей ADR при кожному перегляді ADR-0001 (квартально).
