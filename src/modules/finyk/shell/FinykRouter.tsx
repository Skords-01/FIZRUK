import { SectionErrorBoundary } from "@shared/components/ui/SectionErrorBoundary.jsx";
import { Overview } from "../pages/Overview.jsx";
import { Transactions } from "../pages/Transactions.jsx";
import { Budgets } from "../pages/Budgets.jsx";
import { Assets } from "../pages/Assets.jsx";
import { Analytics } from "../pages/Analytics.jsx";
import type { FinykPage } from "./finykRoute";

// Upstream hooks (`useMonobank`, `useStorage`, `useFinykPersonalization`,
// `useUnifiedFinanceData`) are still in untyped JS / mixed-inferred land;
// each page destructures the fields it cares about without declaring a
// full contract. Typing these as a widened record here would just shift
// the lie one level up. Keep them as `any` in the seam between the
// shell and the pages, matching the existing convention — a future
// hook-typing pass can tighten this without changing call sites.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FinykRouterProps {
  page: FinykPage;
  mono: any;
  storage: any;
  navigate: (page: FinykPage) => void;
  showBalance: boolean;
  categoryFilter: string | null;
  onCategoryClick: (catId: string) => void;
  onClearCategoryFilter: () => void;
  onEditManualExpense: (id: string) => void;
  onQuickAdd: (manualLabel: string | null) => void;
  frequentCategories: any;
  frequentMerchants: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Page switch for Finyk's main surface. Each route is wrapped in
 * SectionErrorBoundary so a crash in one page (e.g. bad Monobank data
 * shape) doesn't take down the whole shell — the user can still swap
 * tabs via bottom nav.
 */
export function FinykRouter({
  page,
  mono,
  storage,
  navigate,
  showBalance,
  categoryFilter,
  onCategoryClick,
  onClearCategoryFilter,
  onEditManualExpense,
  onQuickAdd,
  frequentCategories,
  frequentMerchants,
}: FinykRouterProps) {
  switch (page) {
    case "overview":
      return (
        <SectionErrorBoundary
          key="page-overview"
          title="Не вдалось показати «Огляд»"
        >
          <Overview
            mono={mono}
            storage={storage}
            onNavigate={navigate}
            onCategoryClick={onCategoryClick}
            showBalance={showBalance}
            frequentCategories={frequentCategories}
            frequentMerchants={frequentMerchants}
            onQuickAdd={onQuickAdd}
          />
        </SectionErrorBoundary>
      );
    case "transactions":
      return (
        <SectionErrorBoundary
          key="page-transactions"
          title="Не вдалось показати «Операції»"
        >
          <Transactions
            mono={mono}
            storage={storage}
            showBalance={showBalance}
            categoryFilter={categoryFilter}
            onClearCategoryFilter={onClearCategoryFilter}
            onEditManualExpense={onEditManualExpense}
          />
        </SectionErrorBoundary>
      );
    case "budgets":
      return (
        <SectionErrorBoundary
          key="page-budgets"
          title="Не вдалось показати «Планування»"
        >
          <Budgets mono={mono} storage={storage} />
        </SectionErrorBoundary>
      );
    case "analytics":
      return (
        <SectionErrorBoundary
          key="page-analytics"
          title="Не вдалось показати «Аналітику»"
        >
          <Analytics mono={mono} storage={storage} />
        </SectionErrorBoundary>
      );
    case "assets":
      return (
        <SectionErrorBoundary
          key="page-assets"
          title="Не вдалось показати «Активи»"
        >
          <Assets mono={mono} storage={storage} showBalance={showBalance} />
        </SectionErrorBoundary>
      );
    default:
      return null;
  }
}
