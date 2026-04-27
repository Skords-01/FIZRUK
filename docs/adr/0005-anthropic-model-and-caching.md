# ADR-0005: Anthropic model selection and prompt caching

- **Status:** proposed
- **Date:** 2026-04-27
- **Last reviewed:** 2026-04-27 by @Skords-01
- **Reviewers:** @Skords-01
- **Supersedes:** —
- **Related:**
  - [ADR-0002](./0002-tool-lifecycle.md) §2.7 — prompt-cache budget (закриває «TBD-ADR» на model-selection).
  - [ADR-0002](./0002-tool-lifecycle.md) §2.11 — token-budget cap для `tools` array.
  - [`apps/server/src/modules/chat/chatService.ts`](../../apps/server/src/modules/chat/chatService.ts) — Anthropic client initialization.
  - [`apps/server/src/modules/chat/tools.ts`](../../apps/server/src/modules/chat/tools.ts) — реєстр Anthropic tools.
  - [Anthropic Models](https://docs.anthropic.com/en/docs/about-claude/models) — model versions.
  - [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching).

---

## 0. TL;DR

Закриває open question з ADR-2.8 («Anthropic version bumps / model selection — окремий ADR»). Фіксує:

| Sub-decision | Тема                           | Decision (коротко)                                                                           |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------------- |
| 5.1          | Default model для chat         | `claude-sonnet-4-5` (Sonnet 4.5) — tier-default; pinned env `ANTHROPIC_MODEL_DEFAULT`        |
| 5.2          | Model для photo / vision       | Той самий Sonnet 4.5 (vision-capable); tools `analyze_food_photo` etc. — single-model        |
| 5.3          | Cheap-fallback / batch         | `claude-haiku-4-5` для async digest jobs (`scripts/generate-digest.mjs`)                     |
| 5.4          | Prompt-cache strategy          | `cache_control: ephemeral` на SYSTEM_PREFIX + `tools` array; cache TTL 5 хв                  |
| 5.5          | Cache invalidation             | Will be invalidated automatically на будь-яку зміну SYSTEM_PREFIX or `tools` (ADR-2.7)       |
| 5.6          | Model-version bump policy      | Quarterly review; trial 7 днів staging → production → keep old as `ANTHROPIC_MODEL_FALLBACK` |
| 5.7          | ROI-метрики для prompt-caching | `anthropic_cache_read_input_tokens_total` / `anthropic_cache_creation_input_tokens_total`    |
| 5.8          | Tier-tradeoff (free vs Pro)    | Both tier-и → Sonnet 4.5; quotas regulate usage не model-tier                                |

---

## Context

Поточний код `apps/server/src/modules/chat/chatService.ts` використовує hardcoded model string. Це призводить до:

1. **Tight coupling до Anthropic version-string.** Anthropic deprecate-ить старі моделі через 6-12 місяців — код доводиться mass-edit-ити.
2. **No A/B testing нових моделей.** Не можемо paralelelno run Sonnet 4 і Sonnet 4.5 для 50/50 порівняння.
3. **Prompt-cache ROI невідомий.** Cache-token-аккаунтинг не звітується у Sentry / Prometheus, тому не знаємо економію.
4. **Tier-decision зафіксований у ADR-1.6 / 1.7** (free vs Pro quotas), але **model-tier не зафіксований**. Якщо команда вирішить «Pro отримує Opus, free — Haiku» — це silent business-decision без обговорення.

ADR-2.8 explicitly винесла це у TBD. Запит від користувача — закрити TBD.

**Числа для калькуляції** (станом на 2025-Q4):

| Model             | Input ($/1M tokens) | Output ($/1M tokens) | Cache write | Cache read |
| ----------------- | ------------------- | -------------------- | ----------- | ---------- |
| Claude Opus 4.1   | $15                 | $75                  | $18.75      | $1.50      |
| Claude Sonnet 4.5 | $3                  | $15                  | $3.75       | $0.30      |
| Claude Haiku 4.5  | $1                  | $5                   | $1.25       | $0.10      |

(Числа — округлені, актуалізуємо при кожному review цього ADR.)

Sonnet 4.5 — dramatic жертва quality vs Opus, але має vision + tool-use + prompt-cache. Opus коштує 5× більше і real-world quality-delta на типові Sergeant-сценарії (food classification, finance categorization, workout planning) — невелика згідно офіційних benchmark-ів.

## Decision

### ADR-5.1 — Default model: Claude Sonnet 4.5

**Pinned via `ANTHROPIC_MODEL_DEFAULT` env-var, default `claude-sonnet-4-5-20250929`.**

```ts
// apps/server/src/env/env.ts
ANTHROPIC_MODEL_DEFAULT: z.string().default("claude-sonnet-4-5-20250929"),
ANTHROPIC_MODEL_FALLBACK: z.string().optional(), // previous version, used if primary throws
ANTHROPIC_MODEL_DIGEST: z.string().default("claude-haiku-4-5-20250410"),
```

```ts
// apps/server/src/modules/chat/chatService.ts
const response = await anthropic.messages.create({
  model: env.ANTHROPIC_MODEL_DEFAULT,
  // ...
});
```

**Rationale:** Sonnet 4.5 = **best price/quality для Sergeant use-cases** (chat assistant з tools + occasional vision). Opus reserved for explicit «advanced» mode (Phase 2+, separate decision). Haiku недостатньо good для multi-tool chat-планування.

### ADR-5.2 — Vision-tasks: same Sonnet model

**Не вводимо окремий `ANTHROPIC_MODEL_VISION`.** Tools `analyze_food_photo` (PR-N.X), `extract_receipt_data` (PR-F.X) — використовують default model. Sonnet 4.5 має built-in vision; Haiku — також, але quality regression ~15-20% на complex receipts (test-suite у `apps/server/src/modules/chat/__fixtures__/`).

Якщо у Phase 1 побачимо vision-failures > 5% → reconsider. До того часу — single-model.

### ADR-5.3 — Cheap-fallback: Haiku для async batch jobs

**Daily digest** (`scripts/generate-digest.mjs` — створює summary user-activity для email/push) використовує `ANTHROPIC_MODEL_DIGEST` = Haiku 4.5.

Чому:

- Async, не latency-sensitive (cron at 03:00 Kyiv).
- High-volume (~1 виклик per active user per day).
- Quality-tolerance вища (digest — це template-driven summarization, не intricate reasoning).

Cost-saving rationale: 1000 active users × 1 digest × ~3K tokens output × $5/1M (Haiku) vs $15/1M (Sonnet) = saving ~$30/місяць. Невеликі гроші, але architectural pattern (different models for different latency/quality tiers) — корисний для майбутнього.

### ADR-5.4 — Prompt-cache strategy

Anthropic prompt-cache знижує **повторювані input-tokens** до ~10% від full price. Найбільший виграш — на SYSTEM_PREFIX (~4K tokens, instructions + persona) + `tools` array (~2.7K tokens per ADR-2.11 cap).

**Configuration:**

```ts
const response = await anthropic.messages.create({
  model: env.ANTHROPIC_MODEL_DEFAULT,
  system: [
    {
      type: "text",
      text: SYSTEM_PREFIX,
      cache_control: { type: "ephemeral" }, // ~4K tokens cached
    },
  ],
  tools: TOOLS.map((t) => ({
    ...t,
    cache_control: index === TOOLS.length - 1 ? { type: "ephemeral" } : undefined,
  })),
  // user messages NOT cached (вони unique per request)
  messages: [...],
});
```

**Cache TTL:** 5 хвилин (Anthropic-default ephemeral). Adequate для типового chat-session (10-15 хв). Якщо користувач робить 1 виклик кожні 10 хв — кожен викликає cache-miss, але це майже як без кешу. Acceptable; longer TTL потребує `1h` price-tier.

**Cache miss rate target:** < 30% (тобто > 70% викликів б'ють cache). Реальність побачимо в перші 30 днів post-deploy.

### ADR-5.5 — Cache invalidation

**Automatic** при будь-якій зміні cached content:

1. SYSTEM_PREFIX edit → next deploy → Anthropic cache miss → re-warm протягом перших 5 хвилин після rollout.
2. `tools` array zміни (включно з minor per ADR-2.9) → cache invalidated.
3. Model bump → cache invalidated (cache керується per-model).

**Не automatic:**

- User-message-content cache (ми не використовуємо, бо messages unique).

**Implication для deploy-strategy:** Якщо deploy-имо в peak-час → cache-miss-spike → cost-spike на ~15-30 хв. Mitigation: prefer late-evening Kyiv deploys (low-traffic).

### ADR-5.6 — Model-version bump policy

Anthropic deprecate-ить moдель з 6+-month notice. Policy для bump-у:

1. **Quarterly review** (з ADR-0002 KPI cycle):
   - Чи є нова Sonnet/Haiku версія?
   - Чи стара модель near deprecation?
   - Чи є compelling quality-delta (per Anthropic benchmarks)?
2. **Bump-PR** — окремий PR з:
   - `ANTHROPIC_MODEL_DEFAULT` updated.
   - `ANTHROPIC_MODEL_FALLBACK` set до старої моделі.
   - 7-day staging soak — moніторимо `chat_tool_invocations_total{outcome}`, latency, error-rate.
   - Якщо метрики regress > 10% — revert; reanalyze.
3. **Production rollout:**
   - Gradual: feature-flag `ANTHROPIC_MODEL_NEW_PCT=0..100` на 7 днів.
   - При досягненні 100% — remove FALLBACK, видалити flag.
4. **Emergency revert path:**
   - Якщо нова модель ламає prod (severe regress) → flip env `ANTHROPIC_MODEL_DEFAULT` назад на FALLBACK → restart `apps/server`. <2 хв recovery.
   - Постфактум — incident review + ADR-update.

### ADR-5.7 — ROI-метрики для prompt-cache

Anthropic API повертає у response:

```json
{
  "usage": {
    "input_tokens": 100,
    "cache_creation_input_tokens": 4000,
    "cache_read_input_tokens": 0,
    "output_tokens": 250
  }
}
```

Емит-имо як Prometheus metrics (`apps/server/src/obs/anthropicMetrics.ts`):

| Метрика                                              | Тип       | Опис                                                                |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------- |
| `anthropic_request_total{model, outcome}`            | counter   | Successful + error виклики Anthropic API.                           |
| `anthropic_input_tokens_total{model}`                | counter   | Не-cached input tokens (full-price).                                |
| `anthropic_cache_creation_input_tokens_total{model}` | counter   | Cache writes (1.25× normal price).                                  |
| `anthropic_cache_read_input_tokens_total{model}`     | counter   | Cache reads (0.10× price). High = good.                             |
| `anthropic_output_tokens_total{model}`               | counter   | Output tokens.                                                      |
| `anthropic_request_latency_seconds{model}`           | histogram | End-to-end latency.                                                 |
| `anthropic_cache_hit_ratio{model}`                   | gauge     | `cache_read / (cache_read + input_tokens)` — derived; target > 0.7. |

**Dashboard** (з ADR-1.16 Grafana, окрема секція «Anthropic»): cost-per-day, cache-savings-rate, model-mix.

**Alerts (Sentry):**

- `cache_hit_ratio < 0.5` за 1h window → можливий regression / cache-miss bug.
- `anthropic_request_total{outcome=error}` rate > 1% за 5 хв → API issues.
- Cost-per-day > $50/day (initial threshold; revalidate Phase 1) → operator-alert.

### ADR-5.8 — Tier-tradeoff: same model for free + Pro

**Не диференціюємо model-tier за subscription-plan. Сегментація — через ADR-1.6 / 1.7 quotas.**

Чому:

- Quality-уніфікованість: free-user, що випробовує продукт → отримує full-quality reply, чому платити Pro. Якщо ми даємо їм Haiku → він каже «AI глюкавий» і не конвертує.
- Code-simplicity: один model-string, один flow.
- Quotas (5 chat msg/day для free) обмежують cost — Sonnet × 5 messages × 30 days × ~3K tokens output = ~$0.07/free-user/місяць. Acceptable.
- Якщо free-tier-cost вибухне з ростом DAU → reconsider, але це Phase 1+ problem.

Винятки (майбутні):

- «Advanced AI» у Phase 2 → Opus → Pro-only. Окремий ADR (R-2 backlog).

## Consequences

**Позитивні:**

- Single source-of-truth для model selection — env-vars.
- Quarterly cadence для bump-у — predictable, low-risk.
- Cache-метрики дають feedback для prompt-engineering investments.
- Free-tier quality-parity → conversion-rate not penalized.
- Async-batch (digest) на Haiku → cost-discipline без quality-cost для chat.

**Негативні:**

- Sonnet-cost ~5× Haiku — якщо user-base росте 10× за квартал, Anthropic-bill зростає proportionally. Mitigation: cost-per-day alert (ADR-5.7).
- Cache-strategy depends on infrequent SYSTEM_PREFIX/tools edits. Якщо ми deploy-имо щодня — cache-hit-ratio низький. Mitigation: batch tool-edits в weekly release-train.
- Quarterly review — ще один ритуал. Acceptable; aligned з ADR-0001 review.

## Alternatives considered

- **Opus як default:** dramatically dorozha; quality-improvement не виправдовує cost для типових Sergeant flow. Відкинуто.
- **Haiku як default:** під-quality для chat-with-tools; tool-call success-rate regress. Відкинуто.
- **OpenAI як backup model:** додає інтеграційний overhead (різний tools-протокол), різну prompt-engineering. Відкинуто до Phase 2.
- **No prompt-cache (always full-price):** simplest, але cost-наskрізне ~10×. Відкинуто.
- **Long-term cache (1h tier):** 2× write-cost, але longer TTL. Не виграшно при наших low-traffic-MVP. Відкинуто.

## Open questions

1. **Coach-persona experiments.** Якщо плануємо різні system-prompt-и для різних personas (finyk vs fizruk vs nutrition coach), кожен має свій SYSTEM_PREFIX → cache-fragmentation. Поточний default — single combined prefix; розщеплюємо лише якщо одна persona вмirає cache для іншої. Detail в ADR-2.7 follow-up.
2. **Streaming чи non-streaming?** Зараз `chatService` non-streaming. Streaming → краще UX, але tools-flow складніший. Не пов'язано з model-selection — окремий ADR (R-2 backlog).
3. **Self-hosted alternative (Llama 3, GPT-OSS).** Cost вище в short-term (GPU-rental), але long-term hedging. Не пріоритет MVP.

## Implementation tracker

| PR      | Реалізує ADR   | Статус  |
| ------- | -------------- | ------- |
| PR-12.G | ADR-5.1—5.7    | pending |
| PR-12.H | ADR-5.3 digest | pending |

Reviews quarterly разом з ADR-0002.
