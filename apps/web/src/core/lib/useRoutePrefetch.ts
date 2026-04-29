/**
 * Route Prefetch System
 *
 * Intelligently prefetches route chunks on:
 * - Idle time (requestIdleCallback)
 * - Hover/focus over navigation elements
 * - Visibility in viewport (IntersectionObserver)
 *
 * Uses dynamic imports matching lazy() definitions in App.tsx to ensure
 * the same chunks are loaded.
 */

type ModuleKey = "finyk" | "fizruk" | "routine" | "nutrition";
type PageKey =
  | "auth"
  | "profile"
  | "pricing"
  | "assistant"
  | "resetPassword"
  | "design";

// Map of lazy imports matching App.tsx definitions
const moduleImports: Record<ModuleKey, () => Promise<unknown>> = {
  finyk: () => import("../../modules/finyk/FinykApp"),
  fizruk: () => import("../../modules/fizruk/FizrukApp"),
  routine: () => import("../../modules/routine/RoutineApp"),
  nutrition: () => import("../../modules/nutrition/NutritionApp"),
};

const pageImports: Record<PageKey, () => Promise<unknown>> = {
  auth: () => import("../auth/AuthPage"),
  profile: () => import("../profile/ProfilePage"),
  pricing: () => import("../PricingPage"),
  assistant: () => import("../AssistantCataloguePage"),
  resetPassword: () => import("../auth/ResetPasswordPage"),
  design: () => import("../DesignShowcase"),
};

// Track prefetched chunks to avoid redundant loads
const prefetchedChunks = new Set<string>();

/**
 * Prefetch a module chunk by key
 */
export function prefetchModule(module: ModuleKey): void {
  if (prefetchedChunks.has(`module:${module}`)) return;

  const importFn = moduleImports[module];
  if (!importFn) return;

  prefetchedChunks.add(`module:${module}`);

  // Use requestIdleCallback for non-blocking prefetch
  if ("requestIdleCallback" in window) {
    requestIdleCallback(
      () => {
        importFn().catch(() => {
          // Silently fail - user will see normal loading if they navigate
          prefetchedChunks.delete(`module:${module}`);
        });
      },
      { timeout: 2000 },
    );
  } else {
    // Fallback for Safari
    setTimeout(() => {
      importFn().catch(() => {
        prefetchedChunks.delete(`module:${module}`);
      });
    }, 100);
  }
}

/**
 * Prefetch a page chunk by key
 */
export function prefetchPage(page: PageKey): void {
  if (prefetchedChunks.has(`page:${page}`)) return;

  const importFn = pageImports[page];
  if (!importFn) return;

  prefetchedChunks.add(`page:${page}`);

  if ("requestIdleCallback" in window) {
    requestIdleCallback(
      () => {
        importFn().catch(() => {
          prefetchedChunks.delete(`page:${page}`);
        });
      },
      { timeout: 2000 },
    );
  } else {
    setTimeout(() => {
      importFn().catch(() => {
        prefetchedChunks.delete(`page:${page}`);
      });
    }, 100);
  }
}

/**
 * Prefetch all primary modules on idle
 */
export function prefetchCriticalModules(): void {
  // Order by usage probability
  const priority: ModuleKey[] = ["finyk", "routine", "fizruk", "nutrition"];

  priority.forEach((module, index) => {
    // Stagger prefetches to avoid network congestion
    setTimeout(() => prefetchModule(module), index * 500);
  });
}

/**
 * Hook props for hover/focus prefetch
 */
export function getModulePrefetchProps(module: ModuleKey) {
  return {
    onMouseEnter: () => prefetchModule(module),
    onFocus: () => prefetchModule(module),
  };
}

export function getPagePrefetchProps(page: PageKey) {
  return {
    onMouseEnter: () => prefetchPage(page),
    onFocus: () => prefetchPage(page),
  };
}

/**
 * Check if a chunk is already prefetched
 */
export function isModulePrefetched(module: ModuleKey): boolean {
  return prefetchedChunks.has(`module:${module}`);
}

export function isPagePrefetched(page: PageKey): boolean {
  return prefetchedChunks.has(`page:${page}`);
}
