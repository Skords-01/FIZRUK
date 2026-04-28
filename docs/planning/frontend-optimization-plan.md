# План оптимізації фронтенду Sergeant

> **Last validated:** 2026-04-28 by @Skords-01. **Next review:** 2026-07-27.

> **Дата аналізу:** Квітень 2026  
> **Версія проекту:** 0.1.0  
> **Стек:** React 18 + Vite + TypeScript + TailwindCSS + PWA (Workbox)

---

## 📋 Зміст

1. [Резюме](#резюме)
2. [Поточний стан](#поточний-стан)
3. [Виявлені проблеми](#виявлені-проблеми)
4. [План покращень](#план-покращень)
5. [Пріоритети впровадження](#пріоритети-впровадження)
6. [Метрики успіху](#метрики-успіху)

---

## Резюме

Проект **Sergeant** — це PWA-застосунок типу "персональний хаб життя" з модулями для фінансів (Finyk), фітнесу (Fizruk), звичок (Routine) та харчування (Nutrition). Проект має **добру архітектурну основу**, але є можливості для суттєвого покращення продуктивності, UX та надійності.

### Ключові сильні сторони ✅

- **Code splitting** — модулі завантажуються лінійно (`lazy()`)
- **Service Worker** з продуманим кешуванням (Workbox)
- **Віртуалізація списків** (react-virtuoso) в критичних місцях
- **Design tokens** та модульна CSS-архітектура
- **Web Vitals monitoring** з відправкою метрик на бекенд
- **Chunk load recovery** — автоматичний reload при stale bundle
- **Optimized QueryClient** з офлайн-стратегією (`networkMode: "offlineFirst"`)
- **Semantic size budgets** (JS: 615 KB brotli, CSS: 22 KB)

### Критичні зони для покращення 🔴

- Потенційні re-renders у складних компонентах
- Відсутність prefetch для прогнозованої навігації
- Неоптимальне завантаження шрифтів
- Можливе покращення perceived performance
- Accessibility gaps у деяких інтерактивних елементах

---

## Поточний стан

### Архітектура бандлу

```
vendor-react     — React core
vendor-router    — React Router
vendor-virtuoso  — react-virtuoso (списки)
vendor-zxing     — QR/barcode scanner
vendor-markdown  — react-markdown
vendor-sentry    — Sentry SDK (lazy)
vendor-web-vitals — Web Vitals (lazy)
vendor           — інші залежності
```

### Поточні ліміти розміру

| Категорія   | Ліміт (brotli) | Статус           |
| ----------- | -------------- | ---------------- |
| JS (всього) | 615 KB         | ✅ Контролюється |
| CSS         | 22 KB          | ✅ Контролюється |

### Data Fetching Pattern

- **TanStack Query** з налаштуваннями:
  - `staleTime: 60s` — агресивне повторне використання кешу
  - `gcTime: 5хв` — розумне очищення після відписки
  - `networkMode: offlineFirst` — PWA-оптимізовано
  - Custom retry logic з auth-awareness

### Service Worker Strategy

- **Navigation** — NetworkFirst (timeout 3s)
- **API GET** — NetworkFirst (timeout 5s, max 30хв cache)
- **Google Fonts** — CacheFirst (1 рік)
- **Precache** — статичні ресурси

---

## Виявлені проблеми

### 🔴 Критичні (P0)

#### 1. Блокуючий рендеринг Google Fonts

**Файл:** `apps/web/index.html`

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans..."
  rel="stylesheet"
/>
```

**Проблема:** Синхронне завантаження CSS шрифтів блокує First Contentful Paint (FCP).

**Вплив:** +100-300ms до FCP на повільних мережах.

---

#### 2. Відсутність Route Prefetching

**Проблема:** Модулі завантажуються тільки при натисканні, без прогнозування.

**Вплив:** Затримка 200-500ms при переході до модуля.

---

#### 3. Потенційні надлишкові re-renders у App.tsx

**Файл:** `apps/web/src/core/App.tsx`

**Проблема:** Великий `AppInner` компонент з багатьма `useEffect` може викликати cascade re-renders.

---

### 🟡 Важливі (P1)

#### 4. Неоптимальне використання memo/useMemo

**Статистика:** ~700+ використань `useMemo/useCallback` у проекті.

**Проблема:** Можлива надмірна мемоізація (overhead) або недостатня в критичних місцях.

---

#### 5. Відсутність Skeleton для всіх lazy-loaded модулів

**Файл:** `apps/web/src/shared/components/ui/ModulePageLoader.tsx`

**Проблема:** Generic loader замість контент-специфічних скелетонів створює "flash of loading".

---

#### 6. Image Optimization Gaps

**Файл:** `apps/web/src/shared/components/ui/OptimizedImage.tsx`

**Проблема:**

- Немає `srcset` генерації для responsive images
- Відсутній WebP/AVIF fallback
- Немає priority loading для above-the-fold images

---

### 🟢 Рекомендовані (P2)

#### 7. Bundle Analysis Automation

**Проблема:** `build:analyze` запускається вручну, немає CI інтеграції.

---

#### 8. Відсутність Performance Budgets у CI

**Проблема:** Size-limit налаштований, але не інтегрований в CI pipeline.

---

#### 9. Service Worker Debug Mode

**Проблема:** Debug mode тільки через query param, немає persistent logging.

---

## План покращень

### Фаза 1: Критичні оптимізації (1-2 тижні)

#### 1.1 Оптимізація завантаження шрифтів

**Файл для зміни:** `apps/web/index.html`

```html
<!-- Асинхронне завантаження з font-display: swap -->
<link
  rel="preload"
  href="https://fonts.gstatic.com/s/dmsans/v14/..."
  as="font"
  type="font/woff2"
  crossorigin
/>

<!-- Або через JS для кращого контролю -->
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=DM+Sans...&display=swap"
  onload="this.rel='stylesheet'"
/>
<noscript
  ><link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=DM+Sans...&display=swap"
/></noscript>
```

**Або self-hosting:**

```bash
# Завантажити шрифти локально
npx @fontsource/dm-sans
```

**Очікуваний результат:** -150ms FCP на 3G

---

#### 1.2 Implement Route Prefetching

**Новий файл:** `apps/web/src/shared/hooks/usePrefetch.ts`

```typescript
import { useCallback, useRef } from "react";

const moduleImports = {
  finyk: () => import("../modules/finyk/FinykApp"),
  fizruk: () => import("../modules/fizruk/FizrukApp"),
  routine: () => import("../modules/routine/RoutineApp"),
  nutrition: () => import("../modules/nutrition/NutritionApp"),
};

export function usePrefetchModule() {
  const prefetched = useRef(new Set<string>());

  const prefetch = useCallback((module: keyof typeof moduleImports) => {
    if (prefetched.current.has(module)) return;
    prefetched.current.add(module);

    // Prefetch after idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(
        () => {
          moduleImports[module]?.();
        },
        { timeout: 2000 },
      );
    } else {
      setTimeout(() => moduleImports[module]?.(), 100);
    }
  }, []);

  return { prefetch };
}
```

**Інтеграція в HubTabs:**

```tsx
// onMouseEnter/onFocus для tab buttons
<button onMouseEnter={() => prefetch("finyk")}>Фінік</button>
```

**Очікуваний результат:** -200ms perceived navigation time

---

#### 1.3 Оптимізація AppInner

**Файл:** `apps/web/src/core/App.tsx`

```typescript
// Розбити на менші компоненти
const AuthenticatedApp = memo(function AuthenticatedApp({ user, sync }) {
  // ... authenticated-only logic
});

const UnauthenticatedApp = memo(function UnauthenticatedApp({ onAuth }) {
  // ... unauthenticated paths
});

// Використати composition замість conditional rendering
function AppInner() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  return user
    ? <AuthenticatedApp user={user} />
    : <UnauthenticatedApp />;
}
```

---

### Фаза 2: UX покращення (2-3 тижні)

#### 2.1 Content-Specific Skeletons

**Оновити:** `apps/web/src/shared/components/ui/ModulePageLoader.tsx`

```typescript
const moduleSkeletons = {
  finyk: () => (
    <div className="space-y-4 p-4">
      <Skeleton className="h-24 w-full rounded-2xl" /> {/* Balance card */}
      <Skeleton className="h-12 w-full rounded-xl" /> {/* Quick actions */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  ),
  fizruk: () => (/* Fizruk-specific skeleton */),
  // ...
};

export function ModulePageLoader({ module }: { module: ModuleId }) {
  const Skeleton = moduleSkeletons[module] || GenericSkeleton;
  return <Skeleton />;
}
```

---

#### 2.2 Optimistic UI для критичних дій

**Приклад для routine completions:**

```typescript
const markComplete = useMutation({
  mutationFn: (habitId) => api.completeHabit(habitId),
  onMutate: async (habitId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ["habits"] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(["habits"]);

    // Optimistically update
    queryClient.setQueryData(["habits"], (old) => ({
      ...old,
      completions: [...old.completions, { id: habitId, date: today }],
    }));

    // Haptic feedback
    haptic.success();

    return { previous };
  },
  onError: (err, habitId, context) => {
    // Rollback
    queryClient.setQueryData(["habits"], context.previous);
    toast.error("Не вдалося зберегти");
  },
});
```

---

#### 2.3 Enhanced Image Component

**Оновити:** `apps/web/src/shared/components/ui/OptimizedImage.tsx`

```typescript
interface OptimizedImageProps {
  src: string;
  alt: string;
  priority?: boolean; // Для above-the-fold
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export function OptimizedImage({
  src,
  alt,
  priority = false,
  sizes = '100vw',
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Priority images don't lazy load
  const loading = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? 'high' : 'auto';

  return (
    <picture>
      <source srcSet={toWebP(src)} type="image/webp" />
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        sizes={sizes}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          'transition-opacity duration-300',
          !isLoaded && 'opacity-0'
        )}
        {...props}
      />
    </picture>
  );
}
```

---

### Фаза 3: Інфраструктура та моніторинг (2 тижні)

#### 3.1 CI Performance Budgets

**Файл:** `.github/workflows/performance.yml`

```yaml
name: Performance Budget Check

on: [pull_request]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm build:web

      - name: Check bundle size
        run: pnpm --filter @sergeant/web size

      - name: Upload bundle report
        uses: actions/upload-artifact@v4
        with:
          name: bundle-report
          path: apps/server/dist/bundle-report.html
```

---

#### 3.2 Real User Monitoring Dashboard

**Розширити:** `apps/web/src/core/observability/webVitals.ts`

```typescript
// Додати custom metrics
export function trackInteraction(name: string, duration: number) {
  enqueue({
    name: `interaction_${name}`,
    value: duration,
    rating:
      duration < 100 ? "good" : duration < 300 ? "needs-improvement" : "poor",
  });
}

// Приклад використання
const startTime = performance.now();
await saveTransaction();
trackInteraction("save_transaction", performance.now() - startTime);
```

---

#### 3.3 Automated Lighthouse CI

**Файл:** `lighthouserc.js`

```javascript
module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:5173/", "http://localhost:5173/?module=finyk"],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "first-contentful-paint": ["error", { maxNumericValue: 1500 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        interactive: ["error", { maxNumericValue: 3500 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
```

---

### Фаза 4: Довгострокові покращення (Ongoing)

#### 4.1 React Compiler Integration

**Коли:** React 19 stable + Vite підтримка

```typescript
// vite.config.js
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});
```

**Очікуваний результат:** Автоматична мемоізація, -30% re-renders

---

#### 4.2 Selective Hydration для модулів

```typescript
// Використання React.lazy з Suspense boundaries
const FinykModule = lazy(() =>
  import('../modules/finyk/FinykApp').then(m => ({
    default: m.FinykApp,
  }))
);

// З named suspense для кращого трекінгу
<Suspense fallback={<ModulePageLoader module="finyk" />} name="finyk-module">
  <FinykModule />
</Suspense>
```

---

#### 4.3 Edge Runtime для критичних API

```typescript
// apps/server/api/sync/route.ts
export const runtime = "edge";
export const preferredRegion = ["fra1", "iad1"]; // Ближче до користувачів

export async function POST(req: Request) {
  // Sync logic optimized for edge
}
```

---

## Пріоритети впровадження

| Пріоритет | Завдання                   | Вплив  | Складність | Статус |
| --------- | -------------------------- | ------ | ---------- | ------ |
| **P0**    | Font loading optimization  | High   | Low        | DONE   |
| **P0**    | Route prefetching          | High   | Medium     | DONE   |
| **P0**    | AppInner refactoring       | Medium | Medium     | DONE   |
| **P1**    | Content-specific skeletons | Medium | Low        | DONE   |
| **P1**    | Optimistic UI patterns     | High   | Medium     | TODO   |
| **P1**    | Image optimization         | Medium | Medium     | DONE   |
| **P2**    | CI performance budgets     | Low    | Low        | DONE   |
| **P2**    | Lighthouse CI              | Low    | Medium     | EXISTS |
| **P2**    | RUM dashboard              | Medium | Medium     | EXISTS |

---

## Метрики успіху

### Core Web Vitals Targets

| Метрика | Поточне\* | Ціль   | Покращення |
| ------- | --------- | ------ | ---------- |
| LCP     | ~2.5s     | <2.0s  | -20%       |
| FID/INP | ~100ms    | <100ms | Maintain   |
| CLS     | ~0.05     | <0.05  | Maintain   |
| FCP     | ~1.8s     | <1.2s  | -33%       |
| TTFB    | ~200ms    | <200ms | Maintain   |

\*Орієнтовні значення, потребують baseline вимірювання

### User Experience Targets

| Метрика            | Ціль              |
| ------------------ | ----------------- |
| Module switch time | <200ms perceived  |
| Transaction save   | <100ms optimistic |
| List scroll        | 60fps maintained  |
| Offline capability | Full CRUD offline |

### Bundle Size Targets

| Категорія    | Поточний ліміт | Новий ліміт |
| ------------ | -------------- | ----------- |
| JS (total)   | 615 KB         | 550 KB      |
| JS (initial) | —              | 200 KB      |
| CSS          | 22 KB          | 20 KB       |

---

## Додаткові ресурси

- [Web Vitals Documentation](https://web.dev/vitals/)
- [React Performance Patterns](https://react.dev/learn/render-and-commit)
- [Workbox Strategies](https://developer.chrome.com/docs/workbox/modules/workbox-strategies/)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)

---

## Історія змін

| Дата       | Версія | Автор | Опис                            |
| ---------- | ------ | ----- | ------------------------------- |
| 2026-04-28 | 1.0    | v0    | Початковий аналіз та план       |
| 2026-04-28 | 1.1    | v0    | Імплементація P0-P2 оптимізацій |
