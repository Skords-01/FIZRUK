# План Виправлень та Покращень Sergeant

> **Дата створення:** 2026-04-28
> **Базовий аудит:** `docs/audits/2026-04-28-sergeant-comprehensive-audit.md`
> **Власник:** @Skords-01
> **Тривалість:** 12 тижнів

---

## Швидкий Огляд

| Фаза                 | Тривалість  | Фокус          | Очікуваний Результат    |
| -------------------- | ----------- | -------------- | ----------------------- |
| 🔴 **Стабілізація**  | Тижні 1-2   | Critical fixes | CI green, 0 flaky tests |
| 🟡 **Observability** | Тижні 3-4   | Monitoring     | Production visibility   |
| 🔵 **Рефакторинг**   | Тижні 5-8   | Code quality   | Maintainable codebase   |
| 🟢 **Оптимізація**   | Тижні 9-10  | Cost & perf    | 50% cost reduction      |
| ⚪ **Buffer**        | Тижні 11-12 | Contingency    | Risk mitigation         |

---

## Фаза 1: Стабілізація 🔴

### Sprint 1.1: Flaky Tests (День 1-3)

**Мета:** Усунути 2 flaky tests на main branch

#### Задачі:

- [ ] **TASK-1.1.1** Fix `WeeklyDigestFooter.test.tsx`

  ```bash
  # Локація
  apps/mobile/src/core/dashboard/WeeklyDigestFooter.test.tsx

  # Паттерн фіксу (з OnboardingWizard)
  # Replace never-resolving mock with mockResolvedValue
  ```

  - **Відповідальний:** @Skords-01
  - **Оцінка:** 2-4 години
  - **Definition of Done:** Test проходить 10/10 послідовних запусків

- [ ] **TASK-1.1.2** Fix `HubSettingsPage.test.tsx`

  ```bash
  apps/mobile/src/core/settings/HubSettingsPage.test.tsx
  ```

  - **Відповідальний:** @Skords-01
  - **Оцінка:** 2-4 години
  - **Definition of Done:** Test проходить 10/10 послідовних запусків

- [ ] **TASK-1.1.3** Update AGENTS.md flaky tests list
  - Видалити записи про виправлені тести
  - **Оцінка:** 30 хвилин

**Commit scope:** `test(mobile)`

---

### Sprint 1.2: TypeScript Strictness Phase 1 (День 4-7)

**Мета:** Увімкнути `strictNullChecks` для `apps/web`

#### Задачі:

- [ ] **TASK-1.2.1** Baseline: запустити typecheck з strictNullChecks

  ```bash
  # Тимчасово змінити apps/web/tsconfig.json
  # Зібрати список помилок
  pnpm --filter @sergeant/web typecheck 2>&1 | tee strict-errors.log
  ```

  - **Оцінка:** 1 година

- [ ] **TASK-1.2.2** Fix errors in `apps/web/src/shared/**`
  - **Статус:** ✅ Done (PR #870)

- [ ] **TASK-1.2.3** Fix errors in `apps/web/src/core/auth/**`
  - **Оцінка:** 4-6 годин

- [ ] **TASK-1.2.4** Fix errors in `apps/web/src/core/hub/**`
  - **Оцінка:** 6-8 годин

- [ ] **TASK-1.2.5** Enable strictNullChecks permanently

  ```diff
  # apps/web/tsconfig.json
  {
    "compilerOptions": {
  +   "strictNullChecks": true
    }
  }
  ```

  - **Definition of Done:** `pnpm typecheck` green

**Commit scope:** `fix(web)` або `refactor(web)`

---

### Sprint 1.3: localStorage Migration Core (День 8-10)

**Мета:** Мігрувати core модулі на safe storage wrappers

#### Пріоритетні файли:

| Файл                                    | Wrapper                | Складність |
| --------------------------------------- | ---------------------- | ---------- |
| `core/onboarding/OnboardingWizard.tsx`  | `useLocalStorageState` | Medium     |
| `core/insights/AssistantAdviceCard.tsx` | `createModuleStorage`  | Low        |
| `core/insights/TodayFocusCard.tsx`      | `createModuleStorage`  | Low        |
| `core/hub/HubChat.tsx`                  | `createModuleStorage`  | High       |
| `core/hub/HubReports.tsx`               | `createModuleStorage`  | Medium     |

#### Задачі:

- [ ] **TASK-1.3.1** Create `coreStorage` module

  ```typescript
  // apps/web/src/core/lib/coreStorage.ts
  import { createModuleStorage } from "@shared/lib/createModuleStorage";

  export const coreStorage = createModuleStorage("hub");
  export const onboardingStorage = createModuleStorage("onboarding");
  export const insightsStorage = createModuleStorage("insights");
  ```

- [ ] **TASK-1.3.2** Migrate `OnboardingWizard.tsx`
- [ ] **TASK-1.3.3** Migrate `AssistantAdviceCard.tsx`
- [ ] **TASK-1.3.4** Migrate `TodayFocusCard.tsx`
- [ ] **TASK-1.3.5** Update ESLint allowlist (remove migrated files)

**Commit scope:** `refactor(web)`

---

### Sprint 1.4: TypeScript Strictness Phase 2 (День 11-14)

**Мета:** Увімкнути `noImplicitAny`

#### Задачі:

- [ ] **TASK-1.4.1** Fix implicit any in `apps/web/src/modules/finyk/**`
- [ ] **TASK-1.4.2** Fix implicit any in `apps/web/src/modules/fizruk/**`
- [ ] **TASK-1.4.3** Fix implicit any in `apps/web/src/modules/routine/**`
- [ ] **TASK-1.4.4** Fix implicit any in `apps/web/src/modules/nutrition/**`
- [ ] **TASK-1.4.5** Enable noImplicitAny permanently

**Definition of Done:** `pnpm typecheck` green з `noImplicitAny: true`

---

## Фаза 2: Observability 🟡

### Sprint 2.1: Mobile APM Setup (День 15-18)

**Мета:** Інтегрувати Sentry для crash reporting

#### Задачі:

- [ ] **TASK-2.1.1** Install Sentry React Native SDK

  ```bash
  cd apps/mobile
  pnpm add @sentry/react-native
  npx @sentry/wizard@latest -i reactNative
  ```

- [ ] **TASK-2.1.2** Configure Sentry

  ```typescript
  // apps/mobile/src/lib/sentry.ts
  import * as Sentry from "@sentry/react-native";

  export function initSentry() {
    if (__DEV__) return;

    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment: "production",
      tracesSampleRate: 0.2,
      attachScreenshot: true,
      enableAutoSessionTracking: true,
    });
  }
  ```

- [ ] **TASK-2.1.3** Add ErrorBoundary wrapper

  ```typescript
  // apps/mobile/app/_layout.tsx
  import { ErrorBoundary } from '@sentry/react-native';

  export default function RootLayout() {
    return (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <App />
      </ErrorBoundary>
    );
  }
  ```

- [ ] **TASK-2.1.4** Add environment variables

  ```env
  # .env.example
  EXPO_PUBLIC_SENTRY_DSN=
  ```

- [ ] **TASK-2.1.5** Test crash reporting
  ```typescript
  // Test button (dev only)
  <Button onPress={() => Sentry.captureException(new Error('Test'))}>
    Test Sentry
  </Button>
  ```

**Commit scope:** `feat(mobile)`

---

### Sprint 2.2: PostHog RN Integration (День 19-21)

**Мета:** Інтегрувати PostHog для analytics

#### Задачі:

- [ ] **TASK-2.2.1** Install PostHog RN SDK

  ```bash
  cd apps/mobile
  pnpm add posthog-react-native
  ```

- [ ] **TASK-2.2.2** Configure PostHog

  ```typescript
  // apps/mobile/src/lib/analytics.ts
  import PostHog from "posthog-react-native";

  export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY, {
    host: "https://app.posthog.com",
    enableSessionRecording: true,
  });
  ```

- [ ] **TASK-2.2.3** Add key events tracking
  ```typescript
  // Key events to track:
  posthog.capture("app_opened");
  posthog.capture("module_entered", { module: "finyk" });
  posthog.capture("workout_completed", { duration, exercises });
  posthog.capture("meal_logged", { method: "photo" | "manual" | "barcode" });
  ```

**Commit scope:** `feat(mobile)`

---

### Sprint 2.3: Web/Server Sentry (День 22-24)

**Мета:** Уніфікувати error tracking across platforms

#### Задачі:

- [ ] **TASK-2.3.1** Install Sentry for Express

  ```bash
  cd apps/server
  pnpm add @sentry/node
  ```

- [ ] **TASK-2.3.2** Configure server Sentry

  ```typescript
  // apps/server/src/lib/sentry.ts
  import * as Sentry from "@sentry/node";

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      Sentry.expressIntegration(),
      Sentry.httpIntegration(),
      Sentry.pgIntegration(),
    ],
  });
  ```

- [ ] **TASK-2.3.3** Add error handler middleware

  ```typescript
  // apps/server/src/app.ts
  app.use(Sentry.expressErrorHandler());
  ```

- [ ] **TASK-2.3.4** Install Sentry for React (web)
  ```bash
  cd apps/web
  pnpm add @sentry/react
  ```

**Commit scope:** `feat(server)`, `feat(web)`

---

### Sprint 2.4: OpenTelemetry Basic (День 25-28)

**Мета:** Базовий distributed tracing

#### Задачі:

- [ ] **TASK-2.4.1** Install OpenTelemetry packages

  ```bash
  cd apps/server
  pnpm add @opentelemetry/sdk-node \
    @opentelemetry/auto-instrumentations-node \
    @opentelemetry/exporter-trace-otlp-http
  ```

- [ ] **TASK-2.4.2** Configure tracing

  ```typescript
  // apps/server/src/lib/tracing.ts
  import { NodeSDK } from "@opentelemetry/sdk-node";
  import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

  const sdk = new NodeSDK({
    serviceName: "sergeant-api",
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  ```

- [ ] **TASK-2.4.3** Add trace IDs to logs
- [ ] **TASK-2.4.4** Document tracing setup

**Commit scope:** `feat(server)`

---

## Фаза 3: Рефакторинг 🔵

### Sprint 3.1: HubChat Decomposition (Тиждень 5)

**Мета:** Розбити `HubChat.tsx` (~800 LOC) на менші компоненти

#### Структура після рефакторингу:

```
apps/web/src/core/hub/
├── HubChat.tsx           # Main container (~200 LOC)
├── HubChatInput.tsx      # Message input + voice (~150 LOC)
├── HubChatMessages.tsx   # Message list (~200 LOC)
├── HubChatToolCard.tsx   # Tool execution cards (~150 LOC)
└── HubChatQuickActions.tsx  # Quick action buttons (~100 LOC)
```

#### Задачі:

- [ ] **TASK-3.1.1** Extract `HubChatInput`
- [ ] **TASK-3.1.2** Extract `HubChatMessages`
- [ ] **TASK-3.1.3** Extract `HubChatToolCard`
- [ ] **TASK-3.1.4** Extract `HubChatQuickActions`
- [ ] **TASK-3.1.5** Add unit tests for each component
- [ ] **TASK-3.1.6** Integration test for full chat flow

**Commit scope:** `refactor(web)`

---

### Sprint 3.2: Finyk Overview Decomposition (Тиждень 6)

**Мета:** Розбити `Overview.tsx` (~750 LOC)

#### Структура:

```
apps/web/src/modules/finyk/pages/
├── Overview.tsx              # Container (~150 LOC)
├── components/
│   ├── AccountsPanel.tsx     # Account cards (~200 LOC)
│   ├── SpendingChart.tsx     # Spending visualization (~150 LOC)
│   ├── BudgetSummary.tsx     # Budget progress (~150 LOC)
│   └── RecentTransactions.tsx # Transaction list (~100 LOC)
```

**Commit scope:** `refactor(web)`

---

### Sprint 3.3: localStorage Migration Modules (Тиждень 7)

**Мета:** Завершити міграцію localStorage для всіх модулів

#### Залишкові файли:

| Модуль                | Файлів | Оцінка  |
| --------------------- | ------ | ------- |
| `modules/finyk/*`     | 6      | 1 день  |
| `modules/fizruk/*`    | 8      | 1.5 дня |
| `modules/nutrition/*` | 4      | 0.5 дня |
| `modules/routine/*`   | 2      | 0.5 дня |
| Інші (`core/*`)       | ~15    | 2 дні   |

**Commit scope:** `refactor(web)`

---

### Sprint 3.4: Capacitor Boundary Tests (Тиждень 8)

**Мета:** Додати тести для web-native bridge

#### Задачі:

- [ ] **TASK-3.4.1** Create test setup

  ```typescript
  // apps/mobile-shell/vitest.config.ts
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/__tests__/setup.ts"],
    },
  });
  ```

- [ ] **TASK-3.4.2** Test deep link handling
- [ ] **TASK-3.4.3** Test secure storage
- [ ] **TASK-3.4.4** Test push notifications bridge
- [ ] **TASK-3.4.5** Add to CI workflow

**Commit scope:** `test(mobile-shell)`

---

## Фаза 4: Оптимізація 🟢

### Sprint 4.1: Prompt Cache Activation (День 57-60)

**Мета:** Увімкнути Anthropic prompt caching

#### Задачі:

- [ ] **TASK-4.1.1** Add cache_control to system message

  ```typescript
  // apps/server/src/modules/chat/chat.ts
  const systemMessages = [
    {
      type: "text",
      text: SYSTEM_PREFIX,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: context,
      // No cache_control - dynamic per user
    },
  ];
  ```

- [ ] **TASK-4.1.2** Add SYSTEM_PROMPT_VERSION constant

  ```typescript
  // apps/server/src/modules/chat/toolDefs/systemPrompt.ts
  export const SYSTEM_PROMPT_VERSION = "2026-04-28";
  ```

- [ ] **TASK-4.1.3** Test cache behavior locally
- [ ] **TASK-4.1.4** Deploy to staging
- [ ] **TASK-4.1.5** Monitor cache metrics

**Commit scope:** `perf(server)`

---

### Sprint 4.2: Cache Metrics Dashboard (День 61-64)

**Мета:** Візуалізувати cache performance

#### Задачі:

- [ ] **TASK-4.2.1** Add Prometheus metrics

  ```typescript
  const cacheHitCounter = new promClient.Counter({
    name: "anthropic_cache_hits_total",
    help: "Total Anthropic cache hits",
  });

  const cacheMissCounter = new promClient.Counter({
    name: "anthropic_cache_misses_total",
    help: "Total Anthropic cache misses",
  });
  ```

- [ ] **TASK-4.2.2** Create Grafana dashboard
- [ ] **TASK-4.2.3** Add alerting for cache miss spikes

**Commit scope:** `feat(server)`

---

### Sprint 4.3: Final Strict Rollout (День 65-68)

**Мета:** Увімкнути повний `strict: true`

#### Задачі:

- [ ] **TASK-4.3.1** Final typecheck audit
- [ ] **TASK-4.3.2** Enable `strict: true`
  ```diff
  # apps/web/tsconfig.json
  {
    "compilerOptions": {
  -   "strict": false,
  +   "strict": true
    }
  }
  ```
- [ ] **TASK-4.3.3** Update strict-coverage CI metric
- [ ] **TASK-4.3.4** Remove all strict-bypass allowlist entries

**Commit scope:** `feat(web)`

---

### Sprint 4.4: Documentation Update (День 69-70)

**Мета:** Оновити документацію

#### Задачі:

- [ ] **TASK-4.4.1** Update AGENTS.md з новими правилами
- [ ] **TASK-4.4.2** Update apps-status-matrix.md
- [ ] **TASK-4.4.3** Archive completed audit items
- [ ] **TASK-4.4.4** Create post-implementation report

**Commit scope:** `docs(root)`

---

## Tracking & Reporting

### Weekly Standup Template

```markdown
## Тиждень N - Standup

### Завершено

- [ ] TASK-X.Y.Z: опис

### В роботі

- [ ] TASK-X.Y.Z: опис (XX% complete)

### Блокери

- Описати якщо є

### Метрики

- TypeScript strict coverage: XX%
- localStorage allowlist: XX files
- Flaky tests: X
```

### Success Criteria Checklist

```markdown
## End of Phase 1

- [ ] 0 flaky tests on main
- [ ] strictNullChecks enabled
- [ ] noImplicitAny enabled
- [ ] Core localStorage migrated (8 files)

## End of Phase 2

- [ ] Sentry mobile integrated
- [ ] PostHog mobile integrated
- [ ] Server Sentry integrated
- [ ] Basic tracing working

## End of Phase 3

- [ ] HubChat < 300 LOC
- [ ] Finyk Overview < 200 LOC
- [ ] 0 files in localStorage allowlist
- [ ] Capacitor tests passing

## End of Phase 4

- [ ] Prompt cache active
- [ ] Cache hit rate > 70%
- [ ] strict: true enabled
- [ ] Documentation updated
```

---

## Ризики та Мітигація

| Ризик                              | Ймовірність | Вплив  | Мітигація                     |
| ---------------------------------- | ----------- | ------ | ----------------------------- |
| TypeScript errors block deployment | Medium      | High   | Phased rollout, feature flags |
| Sentry increases bundle size       | Low         | Medium | Tree shaking, lazy loading    |
| Prompt cache doesn't work          | Low         | Medium | Test in staging first         |
| Refactoring introduces bugs        | Medium      | High   | Comprehensive tests before    |

---

**Останнє оновлення:** 2026-04-28
**Наступний review:** Щотижня
