import { useEffect, useState } from "react";
import { ModuleBottomNav } from "@shared/components/ui/ModuleBottomNav";
import { ModuleShell } from "@shared/components/layout/ModuleShell";
import { useToast } from "@shared/hooks/useToast";
import { usePwaAction } from "@shared/hooks/usePwaAction";
import { useMonobank } from "./hooks/useMonobank";
import { usePrivatbank } from "./hooks/usePrivatbank";
import { useStorage } from "./hooks/useStorage";
import { useUnifiedFinanceData } from "./hooks/useUnifiedFinanceData";
import { useFinykPersonalization } from "./hooks/useFinykPersonalization";
import { useSwipeTabs } from "./hooks/useSwipeTabs";
import { readRaw, writeRaw } from "./lib/finykStorage.js";
import {
  FINYK_MANUAL_ONLY_KEY,
  enableFinykManualOnly,
} from "./lib/demoData.js";
import { consumePresetPrefill } from "../../core/onboarding/presetPrefill.js";
import { ManualExpenseSheet } from "./components/ManualExpenseSheet.jsx";
import { FinykHeader, type SyncTone } from "./shell/FinykHeader";
import { FinykRouter } from "./shell/FinykRouter";
import { FinykLoginScreen } from "./shell/FinykLoginScreen";
import { FinykAuthErrorBanner } from "./shell/FinykAuthErrorBanner";
import { FinykAddExpenseFab } from "./shell/FinykAddExpenseFab";
import { FINYK_NAV } from "./shell/finykNav";
import { useFinykRoute, type FinykPage } from "./shell/finykRoute";

const PRIVAT_ENABLED = false;
const FAB_PAGES: readonly FinykPage[] = ["overview", "transactions", "budgets"];
const NAV_IDS = FINYK_NAV.map((item) => item.id);

interface FinykAppProps {
  onBackToHub?: () => void;
  pwaAction?: string | null;
  onPwaActionConsumed?: () => void;
}

function deriveSyncTone(status: string | undefined): SyncTone {
  if (status === "error") return { dot: "bg-danger", text: "помилка" };
  if (status === "partial") return { dot: "bg-warning", text: "частково" };
  if (status === "loading") return { dot: "bg-muted", text: "оновлення" };
  return { dot: "bg-success", text: "ок" };
}

export default function FinykApp({
  onBackToHub,
  pwaAction,
  onPwaActionConsumed,
}: FinykAppProps = {}) {
  const mono = useMonobank();
  const privat = usePrivatbank(PRIVAT_ENABLED);
  const toast = useToast();
  const storage = useStorage({ toast });
  const { page, navigate } = useFinykRoute();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(
    () => readRaw("finyk_show_balance_v1", "1") !== "0",
  );
  const [showExpenseSheet, setShowExpenseSheet] = useState(false);
  const [editingManualExpenseId, setEditingManualExpenseId] = useState<
    string | null
  >(null);
  const [quickAddCategory, setQuickAddCategory] = useState<string | null>(null);
  // Prefill опису з FTUX preset sheet («Кава», «Таксі», «Обід»). Окрема
  // стейт-клітинка, бо quick-add з Overview задає лише категорію —
  // description лишається порожнім і поповнюється користувачем.
  const [quickAddDescription, setQuickAddDescription] = useState<string | null>(
    null,
  );
  // "Manual only" bypass: user completed onboarding without Monobank or
  // pressed «Далі без банку» on the login screen. When set, we render
  // the normal Finyk UI populated from manual expenses even if
  // `clientInfo` is still null.
  const [manualOnly, setManualOnly] = useState(
    () => readRaw(FINYK_MANUAL_ONLY_KEY, "") === "1",
  );

  useEffect(() => {
    writeRaw("finyk_show_balance_v1", showBalance ? "1" : "0");
  }, [showBalance]);

  useEffect(() => {
    if (window.location.search.includes("sync=")) {
      const ok = storage.loadFromUrl();
      if (ok) toast.success("Налаштування синхронізовано!");
      else toast.error("Не вдалось завантажити синк-дані");
    }
    // Одноразово при монтуванні: ?sync= у URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  usePwaAction(pwaAction, onPwaActionConsumed, {
    add_expense: () => {
      // FTUX preset sheet може стешити `item.data` у sessionStorage
      // (див. `writePresetPrefill`), щоб плитки «Кава» / «Таксі» / «Обід»
      // не деградували до трьох ідентичних порожніх форм. Споживаємо
      // prefill ТІЛЬКИ для нового запису — без `editingManualExpenseId`.
      const prefill = consumePresetPrefill("finyk");
      navigate("transactions");
      setEditingManualExpenseId(null);
      setQuickAddCategory(
        typeof prefill?.category === "string" ? prefill.category : null,
      );
      setQuickAddDescription(
        typeof prefill?.description === "string" ? prefill.description : null,
      );
      setShowExpenseSheet(true);
    },
  });

  const { mergedMono } = useUnifiedFinanceData({ mono, privat });
  const { frequentCategories, frequentMerchants } = useFinykPersonalization({
    mono: mergedMono,
    storage,
  });

  const { clientInfo, connecting, error, authError, connect } = mono;
  const syncTone = deriveSyncTone(mergedMono?.syncState?.status);

  const swipeHandlers = useSwipeTabs({
    tabIds: NAV_IDS,
    activeId: page,
    onChange: (id) => navigate(id as FinykPage),
  });

  if (!clientInfo && !manualOnly) {
    return (
      <FinykLoginScreen
        connecting={connecting}
        error={error}
        authError={authError}
        onConnect={connect}
        onStartManualOnly={() => {
          enableFinykManualOnly();
          setManualOnly(true);
        }}
        onClipboardError={() =>
          toast.error("Не вдалось прочитати буфер обміну")
        }
        onBackToHub={onBackToHub}
      />
    );
  }

  return (
    <ModuleShell
      header={
        <FinykHeader
          syncTone={syncTone}
          showBalance={showBalance}
          onToggleBalance={() => setShowBalance((v) => !v)}
        />
      }
      overlays={
        <>
          {mono.authError && (
            <FinykAuthErrorBanner
              message={mono.authError}
              onDismiss={() => mono.setAuthError("")}
              onOpenHub={onBackToHub}
            />
          )}
          {FAB_PAGES.includes(page) && (
            <FinykAddExpenseFab
              onClick={() => {
                setEditingManualExpenseId(null);
                setShowExpenseSheet(true);
              }}
            />
          )}
          <ManualExpenseSheet
            open={showExpenseSheet}
            onClose={() => {
              setShowExpenseSheet(false);
              setEditingManualExpenseId(null);
              setQuickAddCategory(null);
              setQuickAddDescription(null);
            }}
            initialExpense={
              editingManualExpenseId
                ? (storage.manualExpenses || []).find(
                    (e: { id: string | number }) =>
                      String(e.id) === String(editingManualExpenseId),
                  ) || null
                : null
            }
            initialCategory={quickAddCategory}
            initialDescription={quickAddDescription}
            frequentCategories={frequentCategories}
            frequentMerchants={frequentMerchants}
            onSave={(expense: { id?: string | number }) => {
              if (expense?.id) {
                storage.editManualExpense?.(expense.id, expense);
                toast.success("Витрату оновлено.");
              } else {
                storage.addManualExpense(expense);
                toast.success("Витрату додано.");
              }
            }}
          />
        </>
      }
      nav={
        <ModuleBottomNav
          items={FINYK_NAV}
          activeId={page}
          onChange={(id) => navigate(id as FinykPage)}
          module="finyk"
        />
      }
      mainClassName="min-h-0 touch-pan-y"
    >
      <div
        className="flex-1 overflow-hidden flex flex-col min-h-0"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <div
          key={`page-${page}`}
          className="flex-1 overflow-hidden flex flex-col min-h-0 motion-safe:animate-fade-in"
        >
          <FinykRouter
            page={page}
            mono={mergedMono}
            storage={storage}
            navigate={navigate}
            showBalance={showBalance}
            categoryFilter={categoryFilter}
            onCategoryClick={(catId) => {
              setCategoryFilter(catId);
              navigate("transactions");
            }}
            onClearCategoryFilter={() => setCategoryFilter(null)}
            onEditManualExpense={(id) => {
              setEditingManualExpenseId(String(id));
              setShowExpenseSheet(true);
            }}
            onQuickAdd={(manualLabel) => {
              setEditingManualExpenseId(null);
              setQuickAddCategory(manualLabel || null);
              setShowExpenseSheet(true);
            }}
            frequentCategories={frequentCategories}
            frequentMerchants={frequentMerchants}
          />
        </div>
      </div>
    </ModuleShell>
  );
}
