# ADR-0004: Account deletion and PII handling

- **Status:** proposed
- **Date:** 2026-04-27
- **Last reviewed:** 2026-04-27 by @Skords-01
- **Reviewers:** @Skords-01
- **Supersedes:** —
- **Related:**
  - [ADR-0001](./0001-monetization-architecture.md) §1.2 — `subscriptions` schema (треба оновити при delete).
  - [ADR-0001](./0001-monetization-architecture.md) §1.15 — idempotency keys (delete-flow це mutation).
  - [ADR-0003](./0003-refund-and-dispute.md) — disputes (delete не повинен тригер-ити dispute).
  - [`apps/server/src/auth.ts`](../../apps/server/src/auth.ts) — Better Auth, source-of-truth для `users`.
  - Ukrainian Закон «Про захист персональних даних» (152/2010-VR), особливо ст. 8 (право суб'єкта на видалення).
  - GDPR Article 17 («right to erasure») — як референс для майбутньої EU-expansion.

---

## 0. TL;DR

User-account deletion — це не тривіальний `DELETE FROM users`. Sergeant зберігає PII у **6+ системах**: Postgres (users + 12 derived tables), Stripe (customer + subscriptions + charges), Sentry (user-context на error-events), Anthropic (chat-content), Mono integrations (cached transactions з Mono-token), client-side (MMKV / localStorage). Без зафіксованого flow:

1. Stripe customer лишається після delete → майбутній re-signup на той самий email створює новий Stripe customer, але старий висить + active subscription може charge-ити.
2. Sentry session-replays містять PII після delete → reportability ризик.
3. Mono OAuth token не revoke-ується → ми вже не маємо доступу, але user-side token stays valid.

Цей ADR фіксує **30-day soft-delete + hard-purge схему** з cross-system cleanup.

| Sub-decision | Тема                            | Decision (коротко)                                                        |
| ------------ | ------------------------------- | ------------------------------------------------------------------------- |
| 4.1          | Inventory PII                   | List of all user-identifying data and where it lives                      |
| 4.2          | Soft-delete window              | 30 days; account marked deleted but recoverable; auth blocked             |
| 4.3          | Hard-purge schedule             | Day-30 cron purges PII per system; non-PII anonymized aggregates retained |
| 4.4          | Stripe-side cleanup             | Cancel subscriptions immediately; delete customer at hard-purge           |
| 4.5          | Third-party integration cleanup | Mono token revoke + cache wipe; Sentry user-purge; OFF cache TTL-only     |
| 4.6          | Audit & compliance trail        | `account_deletions` table with deletion request/completion timestamps     |
| 4.7          | API + UI surface                | `POST /api/account/delete`; settings UI; double-confirm; idempotent       |

---

## Context

Зараз `apps/server/src/auth.ts` — Better Auth handler-и для login/signup, але **delete-handler відсутній**. Якщо user пише support-ticket «видаліть мій акаунт», operator робить:

1. `UPDATE users SET deleted_at = NOW()` — лише в одній table.
2. Stripe customer — нічого; subscription далі активна, charges продовжуються (!).
3. Mono OAuth token — нічого; cached transactions у нашому DB далі sync-аються.
4. Sentry user-context — нічого; на наступному error-event PII лог-ається знову.
5. Chat-history на сервері — нічого.
6. Client local-first storage (MMKV / localStorage) — нічого, бо ми не контролюємо клієнт після logout.

**Регуляторний контекст:**

- UA «Закон про захист персональних даних» (152/2010-VR): право на видалення є, але без жорстких deadlines. Practical: 14-30 днів — defensible.
- GDPR Art 17: 30-day deadline на «без unreasonable delay». Ми не оперуємо в EU MVP, але дизайн-flow повинен бути forward-compatible.
- App Store / Google Play (для `apps/mobile` Phase 1): обов'язкова self-service account-deletion з 2024.

**Хто керує цим питанням зараз:** ніхто. Якщо до launch не закриємо — отримаємо першу dispute/regulatory-complaint в перші 90 днів.

## Decision

### ADR-4.1 — Inventory PII

Усі точки, де живуть user-identifying дані:

| Система                                                              | Дані                                                                                                                                        | Cleanup-метод                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Postgres `users`                                                     | email, hashed password, name, created_at, last_login_at                                                                                     | Soft-delete + hard-purge                               |
| Postgres `sessions`                                                  | session-token, user_id, expires_at                                                                                                          | Hard-delete on soft-delete (`logout-everywhere`)       |
| Postgres `subscriptions`                                             | stripe_customer_id, plan, status                                                                                                            | Status update на soft-delete; row stays for hard-purge |
| Postgres `mono_accounts` / `mono_transactions`                       | user_id, encrypted Mono-token, transaction-data                                                                                             | Hard-delete on soft-delete (PII per UA-banking-law)    |
| Postgres `chat_messages`                                             | user-message-content, AI-response-content                                                                                                   | Hard-delete on soft-delete                             |
| Postgres `nutrition_logs` / `workouts` / `routines` / `transactions` | user-content                                                                                                                                | Hard-delete on hard-purge (day-30)                     |
| Postgres `oauth_accounts`                                            | OAuth-provider tokens (Google, Apple)                                                                                                       | Hard-delete on soft-delete                             |
| Stripe                                                               | Customer, subscriptions, charges, payment-methods                                                                                           | See ADR-4.4                                            |
| Anthropic                                                            | Chat-content (надсилається тільки on-the-fly, **не зберігається** Anthropic-ом понад retention; per Anthropic ToS — 30 днів logging window) | Anthropic-side TTL-only                                |
| Sentry                                                               | User-context (`Sentry.setUser({id, email})`) + replays + breadcrumbs                                                                        | API-call на purge                                      |
| Mono integration                                                     | Auth-token (encrypted у Postgres), webhook-subscriptions                                                                                    | Revoke + delete (ADR-4.5)                              |
| OpenFoodFacts (OFF)                                                  | Не PII (public food-data)                                                                                                                   | TTL-only, no action                                    |
| Client localStorage                                                  | finyk-ledger snapshot, fizruk-workouts, routine-streaks                                                                                     | User-side (logout flushes)                             |
| Client MMKV (mobile)                                                 | те саме + auth-token                                                                                                                        | User-side (logout flushes)                             |

**Не PII (зберігаємо):**

- Anonymized aggregates у `daily_metrics` (DAU, MRR-snapshot — без user-id).
- Audit-trail у `account_deletions` (деталі нижче).
- Stripe `disputes` / `manual_refunds` rows із `user_id` — **зберігаємо мінімально**, заміняємо `user_id` на `[deleted-${original_id_hash}]` (consistent hashing для majority lookup).

### ADR-4.2 — Soft-delete window (30 днів)

**Concept.** На delete-request:

1. `users.deleted_at = NOW()`.
2. All sessions invalidated (logout-everywhere).
3. Auth-handlers reject login/refresh для soft-deleted users.
4. Stripe subscriptions canceled immediately (per ADR-4.4).
5. PII-heavy tables (chat*messages, mono*\*, oauth_accounts) — **hard-deleted одразу** (бо UA-banking-law і Anthropic ToS).
6. Non-PII derived tables (transactions, workouts) — **lишаються** для recovery-window.

**Recovery window:** 30 днів. User може написати support → reverse `deleted_at` → відновити доступ. Stripe subscription — **не відновлюється automatically** (re-subscribe required).

**Чому 30 днів:**

- GDPR-defensible.
- Балансує: dispute-prevention (юзер змінив думку через тиждень) і regulatory-cleanup (longer = більше regulatory exposure).
- Aligned з ADR-1.12 dunning grace + ADR-3.3 dispute-handling timelines.

### ADR-4.3 — Hard-purge schedule

**Daily cron (`scripts/account-purge.mjs`)**:

1. SELECT users WHERE `deleted_at < NOW() - INTERVAL '30 days'` AND `purged_at IS NULL`.
2. For each:
   - DELETE FROM all derived tables (transactions, workouts, routines, nutrition_logs, etc.).
   - UPDATE row у `users` → email='[purged-${hash}]@example.invalid', name=NULL, hashed_password=NULL, всі-PII-fields → NULL. Не DELETE row, тому що foreign-keys у `disputes` / `manual_refunds`.
   - DELETE FROM subscriptions (status вже 'canceled' з ADR-4.2).
   - Stripe API: `customers.del(stripe_customer_id)` (ADR-4.4).
   - Sentry API: `DELETE /api/0/projects/{org}/{project}/users/{id}/` (ADR-4.5).
   - INSERT INTO `account_deletions` (purge completion log).
   - SET `users.purged_at = NOW()`.
3. Cron logs failures → Sentry-alert; operator manually retries.

**Idempotent:** Якщо cron crash-ить mid-run, наступний run picks up via `purged_at IS NULL` predicate. Кожен external API-call використовує idempotency-key (per ADR-1.15).

**Backups:** Postgres backups retain 7 днів (Railway-default) — після hard-purge data зникне з production, але може жити у backup до 7 днів. Acceptable per UA-law (а у GDPR-lifeт цей window described у privacy policy).

### ADR-4.4 — Stripe-side cleanup

**On soft-delete (immediate):**

1. `stripe.subscriptions.update(sub_id, {cancel_at_period_end: false, cancel_at: NOW()})` — immediate cancellation, не grace. (Refund — **NO**, per ADR-3.1 default.)
2. UPDATE `subscriptions` локально → status='canceled', plan='free'.
3. Webhook `customer.subscription.deleted` прийде → handler ігнорує (idempotent через ADR-1.8).
4. **Customer object не видаляємо одразу** — Stripe disputes / refunds можуть прийти у наступні 30 днів і ми хочемо trace до user_id.

**On hard-purge (day-30):**

1. `stripe.customers.del(customer_id)` — soft-delete у Stripe (Stripe сам зберігає payment metadata 5+ років, але customer-record marked deleted).
2. `subscriptions.stripe_customer_id` → NULL у нашому DB (foreign-key constraint relaxed).

**Re-signup на той самий email:**

- New user-row, new Stripe customer, new subscription. Old data — назавжди gone.
- Edge case: user робив deletion → re-signup в day-15 → cron на day-30 спробує purge старий ID. Mitigation: query checks `users.purged_at IS NULL AND users.deleted_at IS NOT NULL AND <new_user_with_same_email_does_not_exist>`. Якщо new user existing — skip purge старого PII (бо re-activated). Detail у `scripts/account-purge.mjs` test suite.

### ADR-4.5 — Third-party integration cleanup

**Mono integration:**

1. On soft-delete: `mono_accounts.token` decrypt → call Mono `DELETE /personal/webhook` → revoke webhook subscriptions.
2. DELETE FROM `mono_accounts` и `mono_transactions` immediately (not at hard-purge).
3. Banking-law (UA): financial transaction history can be retained by Mono itself; ми deleted-имо тільки нашу копію.

**Sentry:**

1. On hard-purge: Sentry API `DELETE /api/0/projects/{org}/{project}/users/{user_id}/` — видаляє user-context з усіх events.
2. Replays — Sentry автоматично TTL (90 днів за default), не зачіпаємо вручну.
3. Sentry environment variable required: `SENTRY_AUTH_TOKEN_PURGE` (org-level secret, scope `project:write`).

**Anthropic:**

1. Anthropic per ToS зберігає logs 30 днів. Ми не маємо прямого API на forced purge для individual-user — це Anthropic-side responsibility.
2. Privacy policy має це чітко вказати: «Чат-повідомлення обробляються Anthropic Inc.; вони зберігаються у Anthropic до 30 днів за їх політикою. При видаленні акаунту локальні копії видаляються негайно.»

**OpenFoodFacts:**

- Public-data, no user-context. No cleanup needed.

**Client-side (MMKV / localStorage):**

- Logout-handler флешить usenadia-зміст storage, including auth-token. Soft-delete тригерить logout-everywhere → next request на сервер 401 → клієнт викликає cleanup.
- Якщо клієнт никогда не connect-иться знову (offline mobile) — данні залишаються на пристрої локально. Це OK: user has physical control.

### ADR-4.6 — Audit & compliance trail

```sql
CREATE TABLE account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                    -- after purge: hash, not foreign-key
  email_at_deletion_hash TEXT NOT NULL,     -- SHA-256(email) for "did this email ever delete?"
  requested_at TIMESTAMPTZ NOT NULL,
  requested_via TEXT NOT NULL,              -- 'self_service' | 'support_ticket' | 'admin'
  soft_deleted_at TIMESTAMPTZ NOT NULL,
  hard_purged_at TIMESTAMPTZ,
  external_cleanup JSONB,                   -- {stripe: 'ok', sentry: 'ok', mono: 'skipped_no_account'}
  notes TEXT
);

CREATE INDEX idx_account_deletions_email_hash ON account_deletions(email_at_deletion_hash);
```

`email_at_deletion_hash` — для anti-fraud (повторна re-signup той самий email одразу після dispute). Якщо потрапляємо у regulatory inquiry, маємо доказ flow.

### ADR-4.7 — API + UI

**API (PR-M.18):**

- `POST /api/account/delete` — required auth, idempotency-key (ADR-1.15). Body: `{ confirmation: "DELETE", reason?: string }`. Response 202 Accepted з `account_deletion_id`.
- `GET /api/account/delete/status` — polling endpoint. Returns `{ status: 'soft_deleted', recovery_until: "...", external_cleanup: {...} }`.
- `POST /api/account/recover` — within 30-day window, requires re-auth + `account_deletion_id`.

**UI:**

- Settings → Account → «Видалити акаунт» (red button, never default action).
- Modal з:
  - Список того, що видаляється (financial data, AI chat history, subscription).
  - Список того, що зберігається 30 днів (audit trail, anonymized aggregates).
  - Текст-input «Введіть DELETE щоб підтвердити».
  - Final confirm button.
- Post-confirm → soft-delete → logout → toast «Акаунт у процесі видалення. У вас є 30 днів на recovery — напишіть в support».
- Mobile (Expo) — той самий flow, required для App Store / Play Store compliance.

## Consequences

**Позитивні:**

- App Store / Google Play compliant (mandatory self-service).
- UA «Закон про персональні дані» compliant.
- GDPR-forward-compatible (лише треба додати EU-data-region requirement для Phase 7).
- Stripe-cleanliness — нема висячих customers, нема phantom subscriptions.
- Sentry / Anthropic / Mono — clean cross-system trail.
- Audit trail захищає від «ви видалили без мого дозволу» disputes.

**Негативні:**

- Schema-overhead: нова table + 12 cleanup-paths. ~3-4 days dev-work для PR-M.18.
- Operator-burden: monitor-ити cron failures + handle recovery-requests.
- Stripe-customer не immediately deleted → можливі 30-day disputes на already-soft-deleted user. Acceptable.
- Backup-window 7 днів — теоретично PII живе у backup після hard-purge. Privacy-policy має це описати.
- Cross-region (mobile) deletion може втратитися — користувач deletion-ив на телефоні offline; повинен потім online-нути. Acceptable.

**Risks not mitigated:**

- Якщо Sentry чи Stripe API down під час hard-purge cron — repeat next day. До 7-day backup-window це OK.
- Операtor-flow на recovery-request не automated. Acceptable до Phase 1.

## Alternatives considered

- **Hard-delete immediately, no recovery window:** Cleaner. Але 5-10% юзерів змінюють думку; цикл «delete → re-signup → втрачені дані → support» — багато friction. Відкинуто.
- **90-day soft-delete:** Більше recovery, але longer regulatory exposure. Industry-standard 30 днів. Відкинуто.
- **Anonymize-instead-of-delete:** Залишити user-row з замаскованими PII, **зберегти transactions** для analytics. Юридично сіро (deletion-right vs. data-retention). Поточна decision = повний hard-purge на day-30; aggregate-stats анонімні з самого початку.
- **Outsource на Stripe Customer Portal:** Stripe має self-service portal, але він видаляє лише payment-method, не user-account. Не покриває цілі.

## Open questions

1. **Anthropic chat-content на server-side.** Чи зберігаємо `chat_messages` довше 30 днів для quality-review (e.g., reproducing tool-handler crashes)? Поточний default — DELETE on soft-delete; trade-off обговорюємо при ADR-0005.
2. **Webhook-events events `event.id` retention vs deletion.** Stripe webhook events (ADR-1.8 — 90 днів) можуть містити customer-email. Acceptable: PII-redaction layer на storage = `JSONB` payload, але email replaced by hash. Implementation у PR-M.7.
3. **Mobile-only delete (offline scenario).** User видаляє на mobile без internet → коли connect-иться, ми should soft-delete server-side. Мобільний клієнт повинен queue-ити delete у offline-queue (cloudSync analog). Detail для ADR-0008 (CloudSync).

## Implementation tracker

| PR      | Реалізує ADR | Статус  |
| ------- | ------------ | ------- |
| PR-M.18 | ADR-4.1—4.7  | pending |

Reviews quarterly разом з ADR-0001.
