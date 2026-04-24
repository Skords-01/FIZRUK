# Sergeant

Персональна платформа-хаб із модулями: **ФІНІК** (фінанси), **ФІЗРУК** (спорт), **Рутина** (календар, звички, план) та **Харчування** (лог їжі, AI-аналіз фото, рецепти). PWA — встановлюється на телефон, працює офлайн. Акаунти та хмарна синхронізація між пристроями через Better Auth + PostgreSQL.

## Модулі

| Модуль     | Опис                                                                                                                                      | Статус |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| ФІНІК      | Особисті фінанси, синхронізація з Monobank, бюджети, борги, активи, тренди витрат, ручне додавання                                        | Готово |
| ФІЗРУК     | Тренування (активне, таймер відпочинку), програми тренувань, прогрес, виміри, фото тіла, щоденник самопочуття                             | Готово |
| Рутина     | Hub-календар, звички зі стріками, хітмеп, статистика, лідери/аутсайдери, деталізація, ремайндери                                          | Готово |
| Харчування | Фото → AI-аналіз макросів, лог їжі, сканер штрихкодів (OFF + USDA + UPCitemdb), денний план, список покупок, комора, рецепти, трекер води | Готово |

## Hub-ядро (спільні фічі)

- **Авторизація**: реєстрація/вхід email+пароль (Better Auth), сесійні cookie, хмарна синхронізація між пристроями
- **Глобальний пошук** (`HubSearch`) — пошук по транзакціях, тренуваннях, їжі та звичках
- **Онбординг** (`OnboardingWizard`) — покроковий wizard для нових користувачів
- **Щотижневий дайджест** (`WeeklyDigestCard`, `useWeeklyDigest`) — AI-зведення тижня по всіх модулях
- **AI-порада дня** (`CoachInsightCard`, `useCoachInsight`, `/api/coach`) — короткі персональні поради на основі даних модулів
- **Рекомендаційний рушій** (`HubRecommendations`, `recommendationEngine`) — крос-модульні підказки без AI API
- **Голосовий ввід** (`VoiceMicButton`, `speechParsers`, `useSpeech`) — Web Speech API в Харчуванні, Фізруку та Фінікові
- **AI-чат** (`HubChat`) — модульний чат з контекстом усіх даних, розбитий на `hubChatContext` / `hubChatActions` / `hubChatUtils` / `hubChatSpeech`
- **PWA shortcuts** — 3 ярлики на головному екрані (нова витрата, почати тренування, додати їжу)
- **Web Push** (`PushNotificationToggle`, `usePushNotifications`, `/api/push/*`) — реальні push-підписки через VAPID (нагадування про звички, тренування, бюджет)
- **Hub-налаштування** (`HubSettingsPage` + `core/settings/*`) — розбита на секції: General, Finyk, Fizruk, Routine, Notifications, AIDigest
- **Hub-звіти** (`HubReports`) — зведені звіти по всіх модулях
- **Індикатор синхронізації** (`SyncStatusIndicator`, `useSyncStatus`) — стан хмарної синхронізації в шапці
- **Офлайн-черга** (`useCloudSync`) — синхронізація з чергою при відновленні з'єднання
- **Щоденні AI-квоти** (`server/aiQuota.js`, таблиця `ai_usage_daily`) — ліміт викликів AI per-user / per-IP

## Структура

Monorepo — **Turborepo + pnpm** workspaces:

```
apps/web/        # React 18 + Vite PWA (головний клієнт)
apps/server/     # Express + PostgreSQL API (TypeScript)
apps/mobile/     # Expo React Native
apps/mobile-shell/ # Capacitor wrapper (iOS/Android)
packages/shared/ # DOM-free утиліти, STORAGE_KEYS, типи
packages/api-client/ # HTTP-шар, ApiError, queryKeys
packages/{finyk,fizruk,nutrition,routine}-domain/ # Типи модулів
packages/design-tokens/ # CSS-змінні
packages/config/ # ESLint plugin, TS configs, Tailwind preset
```

### Фронтенд (`apps/web/src/`)

```
apps/web/src/
├── core/
│   ├── App.tsx                  # Хаб: навігація між модулями, роутинг, composition shell
│   ├── AuthContext.tsx          # AuthProvider + useAuth hook
│   ├── AuthPage.tsx             # Вхід / реєстрація
│   ├── authClient.ts            # Better Auth React client
│   ├── HubBackupPanel.tsx       # Спільний бекап/відновлення
│   ├── HubChat.tsx              # AI-чат shell (Anthropic)
│   ├── HubDashboard.tsx         # Головна сторінка хабу
│   ├── HubInsightsPanel.tsx     # Крос-модульні інсайти
│   ├── HubReports.tsx           # Зведені звіти
│   ├── HubSearch.tsx            # Глобальний пошук по всіх модулях
│   ├── HubSettingsPage.tsx      # Shell-сторінка налаштувань (секції в settings/)
│   ├── hubBackup.ts             # Логіка бекапу/відновлення
│   ├── ErrorBoundary.tsx        # Глобальний ErrorBoundary
│   ├── ModuleErrorBoundary.tsx  # Ізоляція помилок модулів
│   ├── OnboardingWizard.tsx     # Онбординг для нових користувачів
│   ├── TodayFocusCard.tsx       # Картка «сьогодні» (quick actions)
│   ├── WeeklyDigestCard.tsx     # Щотижневий дайджест (UI)
│   ├── useCoachInsight.ts       # AI-порада дня (логіка, /api/coach)
│   ├── useWeeklyDigest.ts       # Щотижневий дайджест (логіка + агрегати)
│   ├── app/                     # App-shell: HubMainContent, HubHeader, HubTabBar,
│   │                            # IOSInstallBanner, usePwaInstall, useIosInstallBanner,
│   │                            # useSWUpdate, pwaAction
│   ├── cloudSync/               # Cloud sync engine (push/pull/offline queue/dirty flags)
│   ├── components/              # ChatMessage, ChatInput, PushNotificationToggle
│   ├── hooks/                   # useSpeech (голос у чаті)
│   ├── hub/                     # Hub-level хуки: useFinykHubPreview та ін.
│   ├── settings/                # Секції HubSettingsPage: General, Finyk, Fizruk,
│   │                            # Routine, Notifications, AIDigest
│   └── lib/                     # hubChatContext, hubChatActions, hubChatUtils, hubChatSpeech,
│                                # insightsEngine, weeklyDigestAggregates,
│                                # recommendationEngine, speechParsers
├── modules/
│   ├── finyk/                   # Фінанси
│   │   ├── FinykApp.tsx         # Entry компонент модуля, навігація + роутинг
│   │   ├── pages/               # Overview, Transactions, Budgets, Assets, Analytics
│   │   ├── components/          # BudgetTrendChart, CategoryChart, DebtCard,
│   │   │                        # ManualExpenseSheet, NetworthChart, TxListItem, ...
│   │   ├── hooks/               # useMonobank, usePrivatbank, useAnalytics,
│   │   │                        # useBudget, useUnifiedFinanceData
│   │   ├── domain/              # Transaction (уніфікована модель + normalizeTransaction),
│   │   │                        # selectors, budget, debtEngine, subscriptionUtils
│   │   └── lib/                 # finykStorage, finykBackup, forecastEngine
│   ├── fizruk/                  # Спорт
│   │   ├── pages/               # Dashboard, Atlas, Workouts, Progress,
│   │   │                        # Measurements, PlanCalendar, Body, Programs
│   │   ├── components/          # BodyAtlas, WorkoutTemplatesSection, WeeklyVolumeChart, ...
│   │   ├── components/workouts/ # ActiveWorkoutPanel, ExercisePickerSheet, RestTimerOverlay, ...
│   │   ├── hooks/               # useWorkouts, useWorkoutTemplates, useExerciseCatalog,
│   │   │                        # useRecovery, useMeasurements, useTrainingProgram, ...
│   │   ├── data/                # exercises.gymup.json — каталог вправ
│   │   └── lib/                 # fizrukStorage, recoveryCompute, workoutStats, workoutUi
│   ├── routine/                 # Рутина та Hub-календар
│   │   ├── components/          # HabitHeatmap, RoutineCalendarPanel, WeekDayStrip, ...
│   │   ├── context/             # RoutineCalendarContext (data + actions)
│   │   ├── hooks/               # useRoutinePushups, useRoutineReminders
│   │   └── lib/                 # routineStorage, streaks, weekUtils, habitOrder
│   └── nutrition/               # Харчування
│       ├── components/          # AddMealSheet, BarcodeScanner, DailyPlanCard,
│       │                        # PhotoAnalyzeCard, RecipesCard, WaterTrackerCard, ...
│       ├── hooks/               # useNutritionLog, usePhotoAnalysis, useShoppingList,
│       │                        # useWaterTracker, useNutritionPantries, ...
│       └── lib/                 # nutritionStorage, macros, recipeBook, pantryTextParser,
│                                # shoppingListStorage, waterStorage, foodDb/
└── shared/
    ├── components/ui/           # Button, Card, Icon, Input, EmptyState, Toast, ...
    ├── hooks/                   # useDarkMode, useDebounce, useDialogFocusTrap, ...
    └── lib/                     # cn, storage (safeReadLS/safeWriteLS), perf, themeHex
```

### Сервер (`apps/server/src/`)

```
apps/server/src/
├── index.ts         # Entrypoint
├── app.ts           # Express factory: createApp(...)
├── auth.ts          # Better Auth (email/password, session cookies)
├── db.ts            # PostgreSQL pool, ensureSchema(), SQL міграції
├── aiQuota.ts       # Денні AI-квоти (ai_usage_daily) per-user / per-IP
├── config.ts        # Runtime config (порт, режим, trust proxy)
├── http/            # Middleware: authMiddleware, rateLimit, validate (Zod),
│                    # CORS, Helmet CSP, errorHandler, requireAiQuota, requestId
├── routes/          # Express роутери: auth, sync, push, chat, coach, barcode,
│                    # banks, nutrition, food-search, weekly-digest, health, me
├── modules/         # Бізнес-логіка: sync (LWW conflict resolution), push, weekly-digest
├── push/            # APNs + FCM clients
├── obs/             # Pino logger, Prometheus metrics, requestContext
└── migrations/      # SQL міграції (001_noop, 002_ai_usage_daily, ...)
```

Дорожня карта та ТЗ по модулях: [docs/hub-modules-roadmap.md](docs/hub-modules-roadmap.md).

**Деплой:** фронт Vercel + API/PostgreSQL на Railway — покроково [docs/railway-vercel.md](docs/railway-vercel.md). Локальна БД: `npm run db:up` (Docker Compose).

## HubChat (AI-чат)

**Архітектура:** клієнт `src/core/HubChat.tsx` + `src/core/lib/hubChatActions.ts` (виконавець tool-calls) ↔ сервер `server/modules/chat.js` (Anthropic tool-use, Claude Sonnet 4.6). Користувач керує всіма 4 модулями голосом або текстом без переходу в UI.

**Інструменти (32):**

| Модуль     | Tools                                                                                                                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Фінік      | `create_transaction`, `delete_transaction`, `change_category`, `hide_transaction`, `create_debt`, `mark_debt_paid`, `create_receivable`, `set_budget_limit`, `update_budget`, `set_monthly_plan`, `add_asset`, `import_monobank_range` |
| Фізрук     | `plan_workout`, `start_workout`, `finish_workout`, `log_set`, `add_program_day`, `log_measurement`, `log_wellbeing`                                                                                                                    |
| Рутина     | `create_habit`, `mark_habit_done`, `complete_habit_for_date`, `create_reminder`, `archive_habit`, `add_calendar_event`                                                                                                                 |
| Харчування | `log_meal`, `log_water`, `add_recipe`, `add_to_shopping_list`, `consume_from_pantry`, `set_daily_plan`, `log_weight`                                                                                                                   |

**Приклади промптів:**

- "Видали транзакцію m_abc123" → `delete_transaction`
- "Постав ліміт на кафе 3000 грн" → `update_budget { scope:'limit', ... }`
- "Створи ціль 'Відпустка' на 30 000 грн, вже зібрано 5000" → `update_budget { scope:'goal', ... }`
- "Закрий борг оренди" → `mark_debt_paid`
- "Додай актив депозит Приват 100 000 грн" → `add_asset`
- "Оновити монобанк з 1 травня до сьогодні" → `import_monobank_range`
- "Почни тренування" / "Заверши тренування" → `start_workout` / `finish_workout`
- "Запиши заміри: вага 78.5, талія 82" → `log_measurement`
- "В понеділок груди/трицепс: жим 4×8 80 кг, розводка 3×12" → `add_program_day`
- "Самопочуття: вага 78, сон 7.5 год, енергія 4/5" → `log_wellbeing`
- "Нагадай про розминку о 8:00" → `create_reminder`
- "Познач 'Пити воду' виконаною на 10 червня" → `complete_habit_for_date`
- "Заархівуй звичку ..." → `archive_habit`
- "Додай у календар 'Лікар' 1 липня о 9:30" → `add_calendar_event`
- "Збережи рецепт 'Овочевий суп', інгредієнти ..." → `add_recipe`
- "Додай у список покупок молоко 2 л" → `add_to_shopping_list`
- "Використав яйця з комори" → `consume_from_pantry`
- "Постав щоденний план: 2200 ккал, білок 150 г, вода 2.5 л" → `set_daily_plan`
- "Запиши вагу 77.3" → `log_weight`

**Квоти:** кожен виклик `/api/chat` (перший крок та tool-result-продовження) інкрементує `aiQuota` через `requireAiQuota()`-middleware. Ліміти — `AI_DAILY_USER_LIMIT` / `AI_DAILY_ANON_LIMIT`.

**Тести:** `src/core/lib/hubChatActions.test.ts` + `hubChatActionsExtended.test.ts` (клієнтські обробники, localStorage mutations), `server/modules/chat.test.js` (tool-parsing з мок-Anthropic).

## PWA

Hub — повноцінний Progressive Web App:

- **Встановлення**: на Android/iOS браузер запропонує «Додати на головний екран» або натисніть іконку в адресному рядку. Install banner з'являється після 2+ сесій і 30 секунд взаємодії.
- **Офлайн**: Service Worker кешує статику та shell — базовий інтерфейс доступний без мережі. Дані модулів зберігаються в localStorage.
- **Оновлення**: при виході нової версії SW автоматично оновлюється у фоні; з'являється банер «нова версія».
- **Shortcuts**: 3 ярлики на головному екрані — «Нова витрата», «Почати тренування», «Додати їжу» (deep-link через `?module=X&action=Y`).
- **Web Push**: справжні push-підписки через VAPID — `usePushNotifications` підписує клієнт на `/api/push/subscribe`, сервер розсилає нагадування (звички, тренування, бюджет) через `web-push`; SW показує нотифікації у фоні з діями (deep-link до потрібного модуля).

## Запуск

```bash
pnpm install      # встановити залежності
pnpm dev          # web + server паралельно (Turborepo)
```

Або окремо у двох терміналах:

```bash
cd apps/server && pnpm dev   # Express API, порт 3000
cd apps/web    && pnpm dev   # Vite dev server, порт 5173 (проксує /api → 3000)
```

На Replit: `pnpm start:replit` — єдиний unified-процес (фронт + API, порт 5000).

## Змінні середовища

| Змінна                     | Обов'язково | Опис                                                                                                                                              |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Так (авто)  | PostgreSQL connection string — авто-надається Replit; для Railway/Vercel задати вручну                                                            |
| `BETTER_AUTH_SECRET`       | Так         | Секрет шифрування сесій Better Auth (32+ символи) — задати вручну як secret                                                                       |
| `BETTER_AUTH_URL`          | Ні          | Базова URL сервера для Better Auth (авто-визначається з `REPLIT_DEV_DOMAIN` або в Railway — з хоста)                                              |
| `ANTHROPIC_API_KEY`        | Так         | Ключ Anthropic (чат, аналіз фото, рецепти, дайджест, денні підказки, AI-порада)                                                                   |
| `VAPID_PUBLIC_KEY`         | Для push    | Публічний VAPID-ключ для Web Push. Генерація: `node -e "const wp=require('web-push');console.log(wp.generateVAPIDKeys())"`                        |
| `VAPID_PRIVATE_KEY`        | Для push    | Приватний VAPID-ключ (пара до `VAPID_PUBLIC_KEY`)                                                                                                 |
| `VAPID_EMAIL`              | Для push    | `mailto:you@example.com` — контакт для push-серверів                                                                                              |
| `API_SECRET`               | Для push    | Внутрішній секрет для `POST /api/push/send` (щоб не було довільних розсилок)                                                                      |
| `AI_DAILY_USER_LIMIT`      | Ні          | Ліміт AI-викликів на залогіненого користувача (за замовч. 120). Перевіряється через `aiQuota.js` і `ai_usage_daily`                               |
| `AI_DAILY_ANON_LIMIT`      | Ні          | Ліміт AI-викликів для анонімного IP (за замовч. 40)                                                                                               |
| `AI_QUOTA_DISABLED`        | Ні          | `1` — повністю вимкнути перевірки квот (напр., для локального dev)                                                                                |
| `ALLOWED_ORIGINS`          | Ні          | Додаткові CORS origin через кому (локальне та preview вже дозволені)                                                                              |
| `VITE_API_BASE_URL`        | Ні          | Базовий URL API **без** завершального `/`, напр. `https://xxx.up.railway.app` (порожньо → відносні шляхи)                                         |
| `VITE_API_PROXY_TARGET`    | Ні          | Тільки для `vite dev`: куди проксувати `/api/*` (типово `http://127.0.0.1:3000`)                                                                  |
| `VITE_NUTRITION_API_TOKEN` | Ні          | Токен Nutritionix для прямих запитів з фронту                                                                                                     |
| `USDA_FDC_API_KEY`         | Ні          | Ключ USDA FoodData Central для barcode-fallback (безкоштовний на [api.data.gov](https://api.data.gov/signup)); без ключа — `DEMO_KEY` (40 req/hr) |
| `PORT`                     | Ні          | Порт Express-сервера (типово `3000`)                                                                                                              |

> `DATABASE_URL` і `BETTER_AUTH_SECRET` не входять до `.env.example` (вони є секретами, а не публічними налаштуваннями). На Replit `DATABASE_URL` надається автоматично при підключенні бази даних. `BETTER_AUTH_SECRET` задається вручну через Secrets.

> Важливо: токени типу `VITE_*` потрапляють у клієнтський бандл — не використовуй їх як повноцінний захист.

## Авторизація та синхронізація

- **Better Auth** — email/password реєстрація/вхід на `/api/auth/*`, сесійні cookie (30 днів, daily refresh).
- **PostgreSQL** (`module_data` table) — JSON blobs per user per module з версійним трекінгом (LWW conflict resolution).
- **Sync endpoints**: `POST /api/sync/push`, `POST /api/sync/pull`, `POST /api/sync/push-all`, `POST /api/sync/pull-all`.
- **useCloudSync**: авто-push при змінах localStorage (debounce 5с) + 2-хв інтервал; офлайн-черга з replay при reconnect.
- **Міграційний UX**: при першому вході з наявними локальними даними — пропонує завантажити або пропустити.
- Auth є опціональною — застосунок повністю працює без входу, але вхід додає хмарний бекап і синхронізацію.

## API на Railway (ліміт Vercel Hobby: ≤12 functions)

Якщо Vercel відмовляє в деплої через кількість serverless-функцій, можна винести **весь** Hub API в один контейнер:

1. У Railway: новий сервіс з цього репозиторію, білд через [`Dockerfile.api`](Dockerfile.api) (див. [`railway.toml`](railway.toml)).
2. У змінних сервісу Railway задати секрети: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, для Web Push — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `API_SECRET`; опційно `NUTRITION_API_TOKEN`, `USDA_FDC_API_KEY`, `ALLOWED_ORIGINS`.
3. У **Vercel** (Environment Variables для Production/Preview): `VITE_API_BASE_URL` = публічний URL Railway (HTTPS).
4. Каталог API — у [`server/modules/`](server/modules/), у корені репо немає `api/`, тож Vercel Hobby не створює десятки serverless-функцій.

Локально: `npm start` (Express, порт 3000). Фронт `npm run dev`: без `VITE_API_BASE_URL` запити йдуть на `/api/*` і проксуються на `VITE_API_PROXY_TARGET`.

## Деплой

Vercel — автоматично при пуші в `main`. У [`vercel.json`](vercel.json): rewrite на `index.html` для SPA, без перехоплення `/api/*`. API — на **Railway** (`Dockerfile.api`). На **Replit**: єдиний unified-сервер `server/replit.mjs` (порт 5000). Дані модулів у **localStorage**; PostgreSQL — тільки для auth та cloud sync.
