import {
  useHashRoute,
  type UseHashRouteResult,
} from "@shared/hooks/useHashRoute";

export const FINYK_PAGES = [
  "overview",
  "transactions",
  "budgets",
  "analytics",
  "assets",
] as const;

export type FinykPage = (typeof FINYK_PAGES)[number];

// Retired: the legacy `payments` tab became `budgets` when monthly
// planning was merged into the budgets page. Keep the alias so deep
// links from older shortcuts, notifications, and bookmarks still work.
const FINYK_ALIASES: Readonly<Record<string, FinykPage>> = {
  payments: "budgets",
};

export function useFinykRoute(): UseHashRouteResult<FinykPage> {
  return useHashRoute<FinykPage>({
    defaultPage: "overview",
    validPages: FINYK_PAGES,
    aliases: FINYK_ALIASES,
  });
}
