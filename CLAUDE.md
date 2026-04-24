# CLAUDE.md — Sergeant

Персональний хаб-додаток (PWA + mobile shell). Чотири модулі: **ФІНІК** (фінанси), **ФІЗРУК** (фітнес), **Рутина** (звички/календар), **Харчування** (їжа/макроси).

Monorepo: **Turborepo + pnpm** workspaces.

---

## Monorepo Layout

```
apps/
  web/           # React 18 + Vite PWA              (@sergeant/web)
  server/        # Express + PostgreSQL API          (@sergeant/server)
  mobile/        # Expo React Native                 (@sergeant/mobile)
  mobile-shell/  # Capacitor wrapper (iOS/Android)   (@sergeant/mobile-shell)
packages/
  shared/        # DOM-free утиліти, STORAGE_KEYS, types  (@sergeant/shared)
  api-client/    # HTTP-шар, ApiError, queryKeys         (@sergeant/api-client)
  finyk-domain/  # Типи та нормалізація транзакцій
  fizruk-domain/ # Типи тренувань
  nutrition-domain/ # Типи харчування
  routine-domain/   # Типи звичок
  design-tokens/ # CSS-змінні (color, radius, spacing)
  config/        # ESLint plugin, TS configs, Tailwind preset
  insights/      # Cross-module insights engine (без React)
```

---

## Dev Setup

```bash
pnpm install              # встановити залежності
pnpm dev                  # web + server паралельно (Turborepo)
pnpm test                 # Vitest unit-тести по всьому monorepo
pnpm typecheck            # tsc --noEmit по всьому monorepo
pnpm lint                 # ESLint по всьому monorepo
pnpm check                # typecheck + lint + test разом
```

Запуск окремо:

```bash
cd apps/web    && pnpm dev   # Vite, порт 5173
cd apps/server && pnpm dev   # tsx watch, порт 3000
```

---

## Storage Convention

**Усі ключі localStorage — тільки через `STORAGE_KEYS`** (`packages/shared/src/lib/storageKeys.ts`). Ніколи не хардкодь рядки типу `"finyk_tx_cache"`.

```ts
import { STORAGE_KEYS } from "@sergeant/shared";

STORAGE_KEYS.FINYK_TX_CACHE; // "finyk_tx_cache"
STORAGE_KEYS.FIZRUK_WORKOUTS; // "fizruk_workouts_v1"
STORAGE_KEYS.NUTRITION_LOG; // "nutrition_log_v1"
STORAGE_KEYS.ROUTINE; // "hub_routine_v1"
STORAGE_KEYS.HUB_CHAT_HISTORY; // "hub_chat_history"
// ... і ще ~50 ключів
```

Читання/запис — через `@shared/lib/storage`:

```ts
import { safeReadLS, safeWriteLS, safeReadStringLS } from "@shared/lib/storage";

safeReadLS<T>(key, fallback); // JSON.parse + fallback при помилці
safeWriteLS(key, value); // JSON.stringify + try/catch
safeReadStringLS(key); // сирий рядок без JSON.parse
```

Preview модуля на дашборді:

```ts
import { selectModulePreview, STORAGE_KEYS } from "@sergeant/shared";
import { safeReadStringLS } from "@shared/lib/storage";

const preview = selectModulePreview(
  "finyk",
  safeReadStringLS(STORAGE_KEYS.FINYK_QUICK_STATS),
);
```

---

## TypeScript

- `strict: true` по всьому monorepo
- Усі компоненти мають мати типізовані props (інтерфейс або inline type)
- Невикористані параметри — тільки через `_`-префікс

```ts
// ✅
function Comp({ onClose: _onClose }: { onClose: () => void }) { ... }

// ❌
function Comp({ onClose }) { ... }   // implicit any
```

---

## React Rules

- **Side effects в render — заборонені.** localStorage-записи, мутації state — тільки в `useEffect`.

```ts
// ✅
useEffect(() => {
  setSessionDays(recordSessionDay() || getSessionDays());
}, []);

// ❌ — може виконатись двічі в React Strict Mode
const ref = useRef(-1);
if (ref.current === -1) ref.current = recordSessionDay();
```

- **IIFE у JSX — заборонені**, виносити у `const` або компонент:

```tsx
// ✅
const Tag: "div" | "main" = activeModule === "routine" ? "div" : "main";
return <Tag id="main">...</Tag>;

// ❌
{(() => { const Tag = ...; return <Tag>...</Tag>; })()}
```

- `memo` / `useCallback` / `useMemo` — лише де є реальна потреба, не превентивно.

---

## Cloud Sync

Директорія: `apps/web/src/core/cloudSync/`

```
cloudSync/
  config.ts          # SYNC_MODULES — список sync-керованих модулів
  types.ts           # EngineArgs, PushAllResponse та ін.
  engine/
    push.ts          # pushDirty (авто) + pushAll (ручний)
    pull.ts          # pullAll
    replay.ts        # replay офлайн-черги при reconnect
    buildPayload.ts  # будує modules payload
    retryAsync.ts    # retry з exponential backoff
  state/
    dirtyModules.ts  # dirty flags + StorageEvent cross-tab listener
    versions.ts      # sync version per module per user
  queue/
    offlineQueue.ts  # offline queue (FIFO, localStorage)
  conflict/
    pushSuccess.ts   # визначає чи push успішний (LWW)
  hook/              # useCloudSync React hook
```

Ключові інваріанти:

- `pushDirty` і `pushAll` при помилці → `addToOfflineQueue` (не мовчки дропати)
- Конфлікт-резолюшн: snapshot `modifiedAt` перед push → якщо `currentModified[mod] !== snapshot[mod]` після відповіді — dirty flag **не** очищується (зміна прийшла mid-flight)
- Cross-tab синхронізація: `StorageEvent` listener на `DIRTY_MODULES_KEY` в `dirtyModules.ts`

---

## Drag-and-Drop (HubDashboard)

`@dnd-kit` з трьома sensors — всі обов'язкові для accessibility:

```ts
import { KeyboardSensor, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
```

---

## HubChat (AI-чат)

32 tools через Anthropic tool-use. Розбивка:

```
core/
  HubChat.tsx             # Shell-компонент (UI, state, SSE handling)
  lib/
    hubChatContext.ts     # Збирає контекст з усіх модулів для системного промпту
    hubChatActions.ts     # Виконавець tool-calls (mutations в localStorage)
    hubChatUtils.ts       # SSE parsing, message normalization, helpers
    hubChatSpeech.ts      # TTS через Web Speech API
```

AI-квоти: `requireAiQuota` middleware на сервері, таблиця `ai_usage_daily`, щоденні ліміти `AI_DAILY_USER_LIMIT` / `AI_DAILY_ANON_LIMIT`.

---

## Weekly Digest

```
core/
  useWeeklyDigest.ts           # React Query хук + storage I/O + re-exports
  lib/
    weeklyDigestAggregates.ts  # Чисті агрегатні функції (без hooks, testable)
```

Сервер: `POST /api/weekly-digest` — Anthropic Sonnet, структурований JSON.

---

## Cross-Module Insights

`apps/web/src/core/lib/insightsEngine.ts` — чистий TS без React. Читає localStorage, рахує кросс-модульні кореляції. Повертає до 4 інсайтів. Порогові значення: ≥20 подій **або** ≥4 тижні даних.

---

## Server Structure

```
apps/server/src/
  index.ts         # Entrypoint
  app.ts           # Express factory: createApp({ servesFrontend, distPath, trustProxy })
  auth.ts          # Better Auth (email/password, session cookies, 30-day TTL)
  db.ts            # PostgreSQL pool, ensureSchema(), SQL міграції
  aiQuota.ts       # AI quota tracking (ai_usage_daily)
  config.ts        # Runtime config (port, mode, trust proxy)
  http/            # Middleware: authMiddleware, rateLimit, validate (Zod),
  │                #   CORS (allowlist), security (Helmet CSP), errorHandler,
  │                #   requireAiQuota, requireSession, requestId, requestLog
  routes/          # Express роутери: auth, sync, push, chat, coach,
  │                #   barcode, banks, nutrition, food-search, weekly-digest,
  │                #   health, me, web-vitals, frontend (SPA fallback)
  modules/         # Бізнес-логіка: sync (LWW conflict), push, weekly-digest
  push/            # APNs + FCM clients
  obs/             # Pino logger, Prometheus metrics, Sentry, requestContext
  migrations/      # SQL міграції (001_noop, 002_ai_usage_daily, ...)
```

Безпека: Zod validation на всіх inputs, Helmet CSP, rate limiting per-route (auth: 20/60s, AI: 20/3600s), Better Auth SameSite cookies.

---

## Web App Structure

```
apps/web/src/
  core/
    App.tsx                  # Shell: модульна навігація, роутинг, глобальні хуки
    HubDashboard.tsx         # Головна: превью модулів, insights, digest, onboarding
    HubChat.tsx              # AI-чат
    HubReports.tsx           # Крос-модульні звіти
    HubSearch.tsx            # Глобальний пошук (з in-memory parse cache)
    HubSettingsPage.tsx      # Налаштування (hub-level)
    app/                     # HubMainContent, HubHeader, HubTabBar, IOSInstallBanner,
    │                        #   usePwaInstall, useIosInstallBanner, useSWUpdate, pwaAction
    cloudSync/               # Cloud sync engine (push/pull/offline queue/dirty flags)
    hub/                     # useFinykHubPreview та інші hub-level хуки
    lib/                     # insightsEngine, weeklyDigestAggregates,
    │                        #   hubChatContext/Actions/Utils/Speech,
    │                        #   recommendationEngine, speechParsers
    settings/                # Секції HubSettingsPage (General, Finyk, Fizruk, ...)
    components/              # ChatMessage, ChatInput, PushNotificationToggle
    hooks/                   # useSpeech
  modules/
    finyk/                   # Фінанси (Monobank/Privatbank, бюджети, активи, борги)
    fizruk/                  # Фітнес (тренування, програми, вимірювання, тіло)
    routine/                 # Звички, Hub-календар, стріки, рутина
    nutrition/               # Їжа, макроси, сканер штрихкодів, рецепти, комора
  shared/
    api/                     # Axios instance, endpoints, queryKeys
    components/ui/           # Button, Card, Icon, Input, EmptyState, Toast, ...
    hooks/                   # useDarkMode, useDebounce, useDialogFocusTrap, ...
    lib/                     # cn, storage, storageKeys (deprecated — use @sergeant/shared)
```

---

## Testing

- **Unit**: Vitest — `*.test.ts/tsx` поруч з файлами або в `__tests__/`
- **E2E**: Playwright (web a11y перевірки), Detox (mobile)
- Mock localStorage: `vi.stubGlobal("localStorage", { getItem: vi.fn(), ... })`

```bash
pnpm test                          # всі тести
pnpm --filter @sergeant/web test   # тільки web
pnpm --filter @sergeant/server test
```

---

## Pre-commit Hooks

Lint-staged: ESLint `--fix` + Prettier `--write` на staged файлах. При невдачі:

1. Fix issue
2. `git add <file>`
3. `git commit` (новий коміт — **не** `--amend`)

---

## Git Workflow

Гілки: `claude/<опис>` (напр. `claude/review-web-project-rvg5h`)

Коміт-формат:

```
type: short description (до 72 символів)

Optional body — explains WHY, not WHAT.

https://claude.ai/code/session_...
```

Push: `git push -u origin <branch-name>`

---

## Environment Variables

| Змінна                                                   | Обов'язково | Опис                                     |
| -------------------------------------------------------- | ----------- | ---------------------------------------- |
| `DATABASE_URL`                                           | Так         | PostgreSQL connection string             |
| `BETTER_AUTH_SECRET`                                     | Так         | Секрет сесій (32+ символи)               |
| `ANTHROPIC_API_KEY`                                      | Так         | Для AI-функцій (чат, аналіз, дайджест)   |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | Для push    | Web Push VAPID ключі                     |
| `API_SECRET`                                             | Для push    | Внутрішній секрет `/api/push/send`       |
| `AI_DAILY_USER_LIMIT`                                    | Ні          | AI-ліміт per user/день (default: 120)    |
| `AI_DAILY_ANON_LIMIT`                                    | Ні          | AI-ліміт per IP/день (default: 40)       |
| `VITE_API_BASE_URL`                                      | Ні          | Базовий URL API (без `/`) — для prod     |
| `USDA_FDC_API_KEY`                                       | Ні          | USDA FoodData Central (barcode fallback) |

Детальний список: [`docs/railway-vercel.md`](docs/railway-vercel.md).
