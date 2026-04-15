# Hub

Персональна платформа-хаб із модулями: **ФІНІК** (фінанси), **ФІЗРУК** (спорт), **Рутина** (календар, звички, план) та **Харчування** (лог їжі, AI-аналіз фото, рецепти). PWA — встановлюється на телефон, працює офлайн.

## Модулі

| Модуль      | Опис                                                                 | Статус |
| ----------- | -------------------------------------------------------------------- | ------ |
| ФІНІК       | Особисті фінанси, синхронізація з Monobank, бюджети, борги, активи   | Готово |
| ФІЗРУК      | Тренування (активне тренування, таймер відпочинку), прогрес, виміри, план | Готово |
| Рутина      | Hub-календар, звички зі стріками, ремайндери, інтеграція Фізрука та Фініка | Готово |
| Харчування  | Фото → AI-аналіз макросів, лог їжі, комора, рецепти, хмарний бекап  | Готово |

## Структура

```
src/
├── core/
│   ├── App.jsx                   # Хаб: навігація між модулями
│   ├── HubChat.jsx               # AI-чат (Anthropic)
│   ├── HubBackupPanel.jsx        # Спільний бекап/відновлення
│   ├── hubBackup.js
│   └── ModuleErrorBoundary.jsx
├── modules/
│   ├── finyk/                    # Фінанси
│   │   ├── pages/                # Overview, Transactions, Budgets, Assets, Settings, Chat
│   │   ├── components/           # CategoryChart, DebtCard, NetworthChart, SubCard, SyncModal, TxRow
│   │   ├── hooks/                # useMonobank, useStorage
│   │   ├── domain/               # debtEngine, subscriptionUtils
│   │   └── lib/                  # finykBackup
│   ├── fizruk/                   # Спорт
│   │   ├── pages/                # Dashboard, Atlas, Exercise, Workouts, Progress, Measurements, PlanCalendar
│   │   ├── components/           # BodyAtlas, MiniLineChart, WeeklyVolumeChart, WellbeingChart, WorkoutTemplatesSection
│   │   ├── components/workouts/  # ActiveWorkoutPanel, ExercisePickerSheet, RestTimerOverlay, WorkoutBackupBar, WorkoutFinishSheets
│   │   ├── hooks/                # useExerciseCatalog, useWorkouts, useWorkoutTemplates, useMeasurements, useMonthlyPlan, useRecovery
│   │   └── lib/                  # fizrukStorage, workoutStats, recoveryCompute, recoveryForecast, workoutUi
│   ├── routine/                  # Рутина та Hub-календар
│   │   ├── components/           # RoutineBottomNav, RoutineCalendarPanel, RoutineSettingsSection, WeekDayStrip, PushupsWidget
│   │   ├── hooks/                # useRoutineReminders, useRoutinePushups, useVisualKeyboardInset
│   │   └── lib/                  # routineStorage, hubCalendarAggregate, streaks, weekUtils, finykSubscriptionCalendar, routineConstants
│   └── nutrition/                # Харчування
│       ├── components/           # PhotoAnalyzeCard, LogCard, PantryCard, RecipesCard, AddMealSheet, PantryManagerSheet, ItemEditSheet, ConfirmDeleteSheet, NutritionHeader, NutritionBottomNav
│       ├── hooks/                # useNutritionLog, useNutritionPantries, usePhotoAnalysis
│       ├── domain/               # nutritionBackup
│       └── lib/                  # nutritionStorage, nutritionApi, nutritionCloudBackup, foodDb, recipeBook, recipeCache, pantryTextParser, macros, mealPhotoStorage, nutritionStats, nutritionLogExport
├── shared/
│   ├── components/ui/            # Banner, Button, Card, ConfirmDialog, EmptyState, Input, InputDialog, Select, Skeleton, Toast
│   ├── hooks/                    # useDarkMode, useDialogFocusTrap, useToast
│   └── lib/                      # cn, apiUrl, perf, storageKeys, themeHex
├── sw.js                         # Service Worker (PWA, офлайн-кеш)
└── main.jsx                      # Точка входу, реєстрація SW

server/
├── railway.mjs                   # Express-агрегатор API (Railway / npm start)
├── replit.mjs                    # Entrypoint для Replit
└── api/
    ├── mono.js                   # Proxy до Monobank API
    ├── chat.js                   # AI-чат (Anthropic)
    ├── lib/                      # cors, rateLimit, jsonSafe
    └── nutrition/                # AI-ендпоінти харчування
        ├── analyze-photo.js      # Фото → макроси (Anthropic Vision)
        ├── refine-photo.js       # Уточнення результату аналізу
        ├── day-hint.js           # Підказка по денному раціону
        ├── parse-pantry.js       # Парсинг тексту комори
        ├── recommend-recipes.js  # Рецепти з наявних продуктів
        ├── week-plan.js          # Тижневий план харчування
        ├── backup-upload.js      # Хмарний бекап (завантаження)
        ├── backup-download.js    # Хмарний бекап (відновлення)
        └── lib/                  # Допоміжні утиліти
```

Дорожня карта та ТЗ по модулях: [docs/hub-modules-roadmap.md](docs/hub-modules-roadmap.md).

## PWA

Hub — повноцінний Progressive Web App:

- **Встановлення**: на Android/iOS браузер запропонує «Додати на головний екран» або натисніть іконку в адресному рядку.
- **Офлайн**: Service Worker кешує статику та shell — базовий інтерфейс доступний без мережі. Дані модулів зберігаються в localStorage.
- **Оновлення**: при виході нової версії SW автоматично оновлюється у фоні.

## Запуск

```bash
npm install
npm run dev
```

## Змінні середовища

| Змінна                | Модуль         | Опис                                                                                                              |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`   | Shared AI      | Ключ Anthropic (чат, аналіз фото, рецепти, підказки)                                                             |
| `NUTRITION_API_TOKEN` | Харчування API | Опційно: простий токен-гейт для `/api/nutrition/*` (перевіряється по `X-Token`)                                   |
| `ALLOWED_ORIGINS`     | API (CORS)     | Опційно: дозволені origin через кому (локально й прев'ю вже за замовчуванням)                                     |
| `VITE_API_BASE_URL`   | Фронт (Vite)   | Опційно: якщо API винесено на Railway — базовий URL **без** завершального `/`, напр. `https://xxx.up.railway.app` |
| `VITE_API_PROXY_TARGET` | Dev (Vite)    | Опційно: куди проксувати `/api/*` локально (типово `http://127.0.0.1:3000`)                                      |
| `PORT`                | API-сервер      | Порт Express-сервера (типово `3000`)                                                                              |

> Важливо: токени типу `VITE_*` / `EXPO_PUBLIC_*` **не є секретами** (потрапляють у клієнт). Використовуй їх лише як "легкий гейт" для приватного деплою, а не як повноцінну безпеку.

## API на Railway (ліміт Vercel Hobby: ≤12 functions)

Якщо Vercel відмовляє в деплої через кількість serverless-функцій, можна винести **весь** Hub API в один контейнер:

1. У Railway: новий сервіс з цього репозиторію, білд через [`Dockerfile.api`](Dockerfile.api) (див. [`railway.toml`](railway.toml)).
2. У змінних сервісу Railway задати ті самі секрети, що й для Vercel API: `ANTHROPIC_API_KEY`, опційно `NUTRITION_API_TOKEN`, `ALLOWED_ORIGINS` (додай origin свого Vercel-домену).
3. У **Vercel** (Environment Variables для Production/Preview): `VITE_API_BASE_URL` = публічний URL Railway (HTTPS).
4. Каталог API перенесено в [`server/api/`](server/api/) — **у корені репо немає `api/`**, тож Vercel Hobby не створює десятки serverless-функцій. Запити з фронта йдуть на Railway, якщо задано `VITE_API_BASE_URL`.

Локально API: `npm start` (слухає `PORT`, за замовчуванням 3000). Фронт `npm run dev`: без `VITE_API_BASE_URL` запити йдуть на `/api/*` і **проксуються** на `VITE_API_PROXY_TARGET` (типово `http://127.0.0.1:3000`), див. `vite.config.js`.

## Деплой

Vercel — автоматично при пуші в `main`. У [`vercel.json`](vercel.json): rewrite на `index.html` для SPA, **без** перехоплення `/api/*` (щоб не підміняти відповіді на HTML). API — на **Railway** (`Dockerfile.api`). Дані модулів у **localStorage**; окрема БД лише для синхронізації/акаунтів.
