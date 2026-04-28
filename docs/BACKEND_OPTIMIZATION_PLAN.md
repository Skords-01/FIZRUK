# Backend Optimization Plan — Sergeant API

**Дата:** 2026-04-28  
**Версія:** 1.0  
**Статус:** Аналіз завершено

---

## Зміст

1. [Резюме](#резюме)
2. [Поточний стан архітектури](#поточний-стан-архітектури)
3. [Аналіз продуктивності](#аналіз-продуктивності)
4. [Аналіз безпеки](#аналіз-безпеки)
5. [Аналіз масштабованості](#аналіз-масштабованості)
6. [Виявлені проблеми](#виявлені-проблеми)
7. [План покращень](#план-покращень)
8. [Пріоритети впровадження](#пріоритети-впровадження)
9. [Метрики успіху](#метрики-успіху)

---

## Резюме

### Сильні сторони (що вже добре реалізовано)

| Аспект             | Реалізація                                                                 | Оцінка    |
| ------------------ | -------------------------------------------------------------------------- | --------- |
| **Observability**  | Prometheus метрики, Pino structured logs, Sentry tracing                   | Excellent |
| **Security**       | Helmet CSP, HSTS, rate limiting (Redis+in-memory fallback), redaction      | Very Good |
| **Error Handling** | Operational vs programmer errors, graceful shutdown, refund on AI failures | Excellent |
| **Database**       | Pool management, slow query logging, advisory locks for migrations         | Good      |
| **Authentication** | better-auth з cookie cache, bearer tokens, Google OAuth                    | Very Good |
| **AI Integration** | Prompt caching, auto-continuation, quota management                        | Excellent |

### Області для покращення

| Область            | Проблема                                         | Пріоритет |
| ------------------ | ------------------------------------------------ | --------- |
| Database pooling   | Відсутній connection health check                | P1        |
| Redis reliability  | Немає retry/reconnect стратегії                  | P1        |
| Request timeouts   | Глобальний timeout не налаштований               | P0        |
| Input sanitization | SQL injection protection покриває не всі випадки | P1        |
| Circuit breaker    | Відсутній для зовнішніх API (Anthropic, Mono)    | P2        |
| Horizontal scaling | Single-process architecture                      | P2        |

---

## Поточний стан архітектури

### Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express Server                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Helmet    │  │ Rate Limit  │  │   Request Context (ALS) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         Routes Layer                            │
│  /api/auth  /api/sync  /api/chat  /api/nutrition  /api/mono    │
├─────────────────────────────────────────────────────────────────┤
│                       Modules Layer                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐│
│  │  Chat  │ │  Sync  │ │ Coach  │ │  Mono  │ │   Nutrition    ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                     Infrastructure Layer                        │
│  ┌────────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  PostgreSQL│  │   Redis   │  │  Anthropic│  │   Sentry    │ │
│  │  (pg Pool) │  │  (ioredis)│  │    API    │  │   + OTel    │ │
│  └────────────┘  └───────────┘  └───────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Залежності

```json
{
  "express": "^4.22.1",
  "pg": "^8.20.0",
  "ioredis": "^5.6.1",
  "better-auth": "^1.6.4",
  "pino": "^10.3.1",
  "helmet": "^8.1.0",
  "zod": "^4.3.6",
  "@sentry/node": "^8.55.1",
  "prom-client": "^15.1.3"
}
```

### Поточні ліміти

| Ресурс                   | Ліміт                        | Конфігурація       |
| ------------------------ | ---------------------------- | ------------------ |
| PG Pool max              | 10 (env: PG_POOL_MAX)        | Налаштовується     |
| Body size (default)      | 128KB                        | Жорстко закодовано |
| Body size (AI endpoints) | 10MB                         | Жорстко закодовано |
| Rate limit (auth)        | 20/min                       | Жорстко закодовано |
| Shutdown grace           | 15s (env: SHUTDOWN_GRACE_MS) | Налаштовується     |
| Slow query threshold     | 200ms (env: DB_SLOW_MS)      | Налаштовується     |

---

## Аналіз продуктивності

### Database Layer

**Сильні сторони:**

- Pool metrics (total, idle, waiting) експортуються в Prometheus
- Slow query logging з `DB_SLOW_MS` threshold
- Advisory locks для міграцій запобігають race conditions
- UPSERT з `ON CONFLICT` для sync — атомарні операції

**Проблеми:**

1. **Відсутній connection health check**
   ```typescript
   // Поточний стан: pool.on("error") логує, але не відновлює
   pool.on("error", (err) => {
     logger.error({ msg: "db_pool_error", ... });
   });
   ```
2. **Немає prepared statements cache**
   - Кожен `pool.query()` парсить SQL заново
   - Performance penalty на high-QPS endpoints

3. **Transaction handling в syncPushAll**
   - Правильно використовує `BEGIN/COMMIT/ROLLBACK`
   - Але немає retry на deadlock/serialization failures

### Redis Layer

**Сильні сторони:**

- Lua script для atomic INCR+EXPIRE
- Fallback на in-memory при недоступності Redis
- `maxRetriesPerRequest: 0` — швидкий fail-over

**Проблеми:**

1. **Немає reconnect стратегії**

   ```typescript
   // Поточний стан: одноразовий connect, немає retry
   const client = new Redis(url, {
     maxRetriesPerRequest: 0,
     enableOfflineQueue: false,
   });
   ```

2. **Відсутня health check endpoint для Redis**

### AI/Anthropic Layer

**Сильні сторони:**

- Prompt caching з ephemeral cache_control
- Auto-continuation при max_tokens
- Quota refund на upstream failures
- Client abort propagation через AbortController

**Проблеми:**

1. **Hardcoded timeouts**

   ```typescript
   // 30s для chat, 60s для stream — не конфігурується
   timeoutMs: 30000;
   ```

2. **Немає circuit breaker**
   - При Anthropic outage — кожен запит чекає timeout

### HTTP Layer

**Сильні сторони:**

- Request ID tracking через ALS
- Structured access logs з Pino
- in-flight request gauge

**Проблеми:**

1. **Глобальний request timeout відсутній**
   - Long-running requests можуть зависнути
   - Тільки shutdown hard timeout (25s)

2. **Compression не налаштовано**
   - JSON responses не gzip-уються

---

## Аналіз безпеки

### Authentication & Authorization

**Сильні сторони:**

- better-auth з session cookie cache (5 min TTL)
- Bearer token support для mobile
- Password policy: 10-128 chars
- Email hash fingerprinting для brute-force detection
- Timing-safe credential checks (better-auth internal)

**Проблеми:**

1. **Session invalidation при password change**
   - Не реалізовано явно — залежить від better-auth defaults

2. **Missing CSRF protection**
   - SameSite=None cookies потребують додаткового захисту

### Input Validation

**Сильні сторони:**

- Zod schemas на всіх endpoints
- PII redaction в логах
- Body size limits per-route

**Проблеми:**

1. **SQL injection — потенційні ризики**

   ```typescript
   // sync.ts — параметризовані запити ✓
   await pool.query("... WHERE user_id = $1", [user.id]);

   // Але: динамічний module name в деяких local queries
   // потребує whitelist validation (VALID_MODULES set)
   ```

2. **NoSQL injection в JSON fields**
   - `data` в module_data — JSON blob без schema validation

### Network Security

**Сильні сторони:**

- Helmet з strict CSP для API-only mode
- HSTS з preload
- CORS з explicit origins
- Cross-origin resource policy

**Рекомендації:**

1. **Додати Security headers:**
   ```
   Permissions-Policy: geolocation=(), camera=(), microphone=()
   X-Content-Type-Options: nosniff (вже через Helmet)
   ```

---

## Аналіз масштабованості

### Поточний стан

| Характеристика     | Статус                                          |
| ------------------ | ----------------------------------------------- |
| Stateless requests | Так (сесії в DB)                                |
| Horizontal scaling | Обмежено (in-memory rate limit)                 |
| Connection pooling | PG Pool (10 conns)                              |
| Caching            | Redis для rate limit, prompt cache на Anthropic |
| Background jobs    | Відсутні                                        |

### Bottlenecks

1. **Database connections**
   - PG_POOL_MAX=10 — при 3+ replicas = 30 connections
   - Railway Postgres має ліміт ~100 connections

2. **In-memory state**
   - Rate limit buckets (fallback)
   - No shared state між replicas

3. **AI quota store**
   - Postgres-backed, але не sharded
   - Потенційний bottleneck при high AI usage

---

## Виявлені проблеми

### P0 — Критичні (потребують негайного виправлення)

| ID   | Проблема                               | Вплив                        | Файл                      |
| ---- | -------------------------------------- | ---------------------------- | ------------------------- |
| P0-1 | Відсутній глобальний request timeout   | Zombie requests, memory leak | `app.ts`                  |
| P0-2 | Redis disconnect не triggers reconnect | Rate limiting degraded       | `redis.ts`                |
| P0-3 | Hardcoded AI timeouts                  | Неможливо tune без deploy    | `chat.ts`, `anthropic.ts` |

### P1 — Важливі (впливають на стабільність)

| ID   | Проблема                               | Вплив                      | Файл      |
| ---- | -------------------------------------- | -------------------------- | --------- |
| P1-1 | PG pool без health check               | Silent connection failures | `db.ts`   |
| P1-2 | Немає retry для transient DB errors    | Failed syncs на deadlock   | `sync.ts` |
| P1-3 | Missing response compression           | Higher bandwidth costs     | `app.ts`  |
| P1-4 | Sync payload size not tracked per-user | Abuse potential            | `sync.ts` |

### P2 — Рекомендовані (покращення якості)

| ID   | Проблема                            | Вплив                      | Файл                       |
| ---- | ----------------------------------- | -------------------------- | -------------------------- |
| P2-1 | Немає circuit breaker для Anthropic | Cascade failures           | `anthropic.ts`             |
| P2-2 | Background job queue відсутня       | Email delivery sync        | `authTransactionalMail.ts` |
| P2-3 | Prepared statements не кешуються    | Parsing overhead           | `db.ts`                    |
| P2-4 | Metrics endpoint без caching        | Prometheus scrape overhead | `metrics.ts`               |

---

## План покращень

### Фаза 1: Критичні виправлення (P0)

#### P0-1: Global Request Timeout Middleware

```typescript
// apps/server/src/http/timeout.ts
import type { RequestHandler } from "express";

export interface TimeoutOptions {
  timeoutMs: number;
  message?: string;
}

export function requestTimeout({
  timeoutMs = 30_000,
  message = "Request timeout",
}: TimeoutOptions): RequestHandler {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: message, code: "TIMEOUT" });
      }
    }, timeoutMs);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
}
```

#### P0-2: Redis Reconnect Strategy

```typescript
// apps/server/src/lib/redis.ts — покращення
const client = new Redis(url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null; // Stop retrying
    return Math.min(times * 100, 3000); // Exponential backoff
  },
  reconnectOnError(err) {
    const targetErrors = ["READONLY", "ECONNRESET"];
    return targetErrors.some((e) => err.message.includes(e));
  },
});
```

#### P0-3: Configurable AI Timeouts

```typescript
// Environment variables
AI_CHAT_TIMEOUT_MS = 30000;
AI_STREAM_TIMEOUT_MS = 60000;
AI_CONTINUATION_TIMEOUT_MS = 45000;
```

### Фаза 2: Стабільність (P1)

#### P1-1: PG Pool Health Check

```typescript
// apps/server/src/db.ts — додати
const HEALTH_CHECK_INTERVAL_MS = 30_000;

export async function startPoolHealthCheck(): Promise<NodeJS.Timeout> {
  const check = async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error({ msg: "db_health_check_failed", err: serializeError(err) });
      dbErrorsTotal.inc({ code: "health_check_failed" });
    }
  };

  await check();
  const handle = setInterval(check, HEALTH_CHECK_INTERVAL_MS);
  handle.unref();
  return handle;
}
```

#### P1-2: Retry для Transient DB Errors

```typescript
// apps/server/src/lib/dbRetry.ts
const RETRIABLE_CODES = new Set([
  "40001", // serialization_failure
  "40P01", // deadlock_detected
  "57P01", // admin_shutdown
]);

export async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, baseDelayMs = 100 } = {},
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (!code || !RETRIABLE_CODES.has(code) || attempt === maxRetries) {
        throw err;
      }
      await delay(baseDelayMs * Math.pow(2, attempt));
    }
  }
  throw new Error("Unreachable");
}
```

#### P1-3: Response Compression

```typescript
// apps/server/src/app.ts — додати
import compression from "compression";

// Після helmet, перед routes
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
    threshold: 1024, // Compress responses > 1KB
  }),
);
```

### Фаза 3: Reliability (P2)

#### P2-1: Circuit Breaker для Anthropic

```typescript
// apps/server/src/lib/circuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeMs = 30_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeMs) {
        this.state = "half-open";
      } else {
        throw new CircuitOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}
```

#### P2-2: Background Job Queue (Simple)

```typescript
// apps/server/src/lib/jobQueue.ts
// Для production рекомендується BullMQ, але для початку — простий in-process queue

interface Job<T> {
  id: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
}

class SimpleJobQueue<T> {
  private queue: Job<T>[] = [];
  private processing = false;

  enqueue(payload: T, maxAttempts = 3): void {
    this.queue.push({
      id: crypto.randomUUID(),
      payload,
      attempts: 0,
      maxAttempts,
    });
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      try {
        await this.handler(job.payload);
      } catch (err) {
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          this.queue.push(job);
        } else {
          this.onDeadLetter(job, err);
        }
      }
    }

    this.processing = false;
  }

  handler: (payload: T) => Promise<void> = async () => {};
  onDeadLetter: (job: Job<T>, err: unknown) => void = () => {};
}
```

---

## Пріоритети впровадження

| Пріоритет | Завдання                      | Вплив    | Складність | Термін |
| --------- | ----------------------------- | -------- | ---------- | ------ |
| **P0**    | Global request timeout        | Critical | Low        | DONE   |
| **P0**    | Redis reconnect strategy      | Critical | Low        | DONE   |
| **P0**    | Configurable AI timeouts      | High     | Low        | DONE   |
| **P1**    | PG pool health check          | High     | Medium     | DONE   |
| **P1**    | DB retry for transient errors | High     | Medium     | DONE   |
| **P1**    | Response compression          | Medium   | Low        | DONE   |
| **P1**    | Per-user sync size tracking   | Medium   | Medium     | EXISTS |
| **P2**    | Circuit breaker               | Medium   | Medium     | DONE   |
| **P2**    | Background job queue          | Low      | High       | DONE   |
| **P2**    | Prepared statements cache     | Low      | Medium     | TODO   |

---

## Метрики успіху

### SLO Targets

| Метрика               | Поточний | Ціль     |
| --------------------- | -------- | -------- |
| P99 latency (non-AI)  | ~200ms   | <150ms   |
| P99 latency (AI chat) | ~5s      | <4s      |
| Error rate (5xx)      | ~0.5%    | <0.1%    |
| Availability          | 99.5%    | 99.9%    |
| DB pool utilization   | 60% avg  | <50% avg |

### Prometheus Queries

```promql
# Request latency P99
histogram_quantile(0.99, sum(rate(http_request_duration_ms_bucket[5m])) by (le, path))

# Error rate
sum(rate(http_errors_total{status_class="5xx"}[5m]))
/ sum(rate(http_requests_total[5m]))

# DB pool saturation
db_pool_waiting / db_pool_total

# Rate limit blocks
sum(rate(rate_limit_hits_total{outcome="blocked"}[5m])) by (key)
```

### Alerting Rules

```yaml
groups:
  - name: sergeant-api
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_errors_total{status_class="5xx"}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
        for: 5m
        labels:
          severity: critical

      - alert: DBPoolExhausted
        expr: db_pool_waiting > 5
        for: 2m
        labels:
          severity: warning

      - alert: RedisDown
        expr: absent(up{job="redis"}) or up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
```

---

## Історія змін

| Дата       | Версія | Автор | Опис                            |
| ---------- | ------ | ----- | ------------------------------- |
| 2026-04-28 | 1.0    | v0    | Початковий аналіз та план       |
| 2026-04-28 | 1.1    | v0    | Імплементація P0-P2 оптимізацій |
