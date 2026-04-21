/**
 * Sergeant Finyk — TransactionsPage (React Native).
 *
 * Mobile port of `apps/web/src/modules/finyk/pages/Transactions.tsx`.
 *
 * **Scope of this PR (Phase 4 / Task #10):** the core "browse + add"
 * surface — month-scoped FlatList of `TxListItem` rows fed from
 * `useFinykTransactionsStore`, header with month nav + add button,
 * search input, horizontal filter chips (All / Expense / Income /
 * Credit-card / per-category), and a `ManualExpenseSheet` wired to
 * the store's `addManualExpense` / `updateManualExpense` actions.
 *
 * Mutations flow through `enqueueChange` (inside the store) so every
 * write surfaces in the cloud-sync queue immediately.
 *
 * Deferred to follow-up tasks (per the Phase 4 plan):
 *  - Live Monobank sync (`mono` hook on web → seeded `realTx` here).
 *  - Bulk-select mode + batch category-picker.
 *  - "Show hidden" toggle wiring to the swipe-unhide affordance —
 *    swipe-hide / swipe-delete already work via `TxListItem`.
 *  - Sticky day-group headers — flat list for now to keep the FlatList
 *    item-renderer cheap; the day pill is rendered inline.
 *
 * Why FlatList instead of FlashList: `@shopify/flash-list` isn't in
 * the mobile bundle today and the screen is fed from `manualExpenses`
 * (typically <500 rows) plus optional seeded `realTx`. FlatList with
 * `windowSize` + memoised rows is more than enough for this size and
 * avoids dragging in a new native dep just for this PR.
 */
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  manualExpenseToTransaction,
  type Transaction,
} from "@sergeant/finyk-domain/domain";

import { TxListItem } from "@/modules/finyk/components/TxListItem";
import {
  ManualExpenseSheet,
  type ManualExpensePayload,
} from "@/modules/finyk/components/ManualExpenseSheet";
import {
  useFinykTransactionsStore,
  type FinykTransactionsSeed,
  type ManualExpenseRecord,
} from "@/modules/finyk/lib/transactionsStore";

type FilterId = "all" | "income" | "expense" | "credit";

interface FilterChip {
  id: FilterId;
  label: string;
}

const BASE_FILTERS: FilterChip[] = [
  { id: "all", label: "Всі" },
  { id: "expense", label: "Витрати" },
  { id: "income", label: "Доходи" },
];

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("uk-UA", {
    month: "long",
    year: "numeric",
  });
}

function getMonthBounds(
  year: number,
  month: number,
): { start: number; end: number } {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  return { start, end };
}

export interface TransactionsPageProps {
  /** Test/storybook seed — pre-populates MMKV slices and injects realTx. */
  seed?: FinykTransactionsSeed;
  /** `Date.now()` seam for deterministic jest snapshots. */
  now?: Date;
  /** testID propagated to the screen root + add button. */
  testID?: string;
}

export function TransactionsPage({
  seed,
  now: nowOverride,
  testID = "finyk-transactions",
}: TransactionsPageProps) {
  const store = useFinykTransactionsStore(seed);
  const {
    manualExpenses,
    txCategories,
    txSplits,
    hiddenTxIds,
    realTx,
    accounts,
    customCategories,
    addManualExpense,
    updateManualExpense,
    removeManualExpense,
    hideTx,
  } = store;

  const now = useMemo(() => nowOverride ?? new Date(), [nowOverride]);
  const [selMonth, setSelMonth] = useState<{ year: number; month: number }>(
    () => ({ year: now.getFullYear(), month: now.getMonth() }),
  );
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sheetState, setSheetState] = useState<
    | { open: false }
    | { open: true; editing: ManualExpenseRecord | null }
  >({ open: false });

  const isCurrentMonth =
    selMonth.year === now.getFullYear() && selMonth.month === now.getMonth();
  const monthLabel = formatMonthLabel(selMonth.year, selMonth.month);

  const goMonth = useCallback((delta: number) => {
    setSelMonth((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  }, []);

  // Manual expenses → Transaction shape, scoped to the selected month.
  const manualTxsThisMonth = useMemo<Transaction[]>(() => {
    const { start, end } = getMonthBounds(selMonth.year, selMonth.month);
    return manualExpenses
      .filter((e) => {
        const ts = e.date ? new Date(e.date).getTime() : 0;
        return ts >= start && ts < end;
      })
      .map((e) => manualExpenseToTransaction(e));
  }, [manualExpenses, selMonth.year, selMonth.month]);

  // Combined dataset — real (only when viewing the current month, since
  // historical realTx come from a separate Monobank-history hook on web
  // that isn't ported yet) + manual.
  const activeTx = useMemo<Transaction[]>(
    () => [...(isCurrentMonth ? realTx : []), ...manualTxsThisMonth],
    [isCurrentMonth, realTx, manualTxsThisMonth],
  );

  const hiddenTxIdSet = useMemo(
    () => new Set(hiddenTxIds),
    [hiddenTxIds],
  );

  const creditAccIds = useMemo(
    () =>
      new Set(
        accounts
          .filter((a) => (a.creditLimit ?? 0) > 0)
          .map((a) => a.id),
      ),
    [accounts],
  );

  const categoryFilters = useMemo<FilterChip[]>(
    () =>
      customCategories.map((c) => ({
        id: c.id as FilterId,
        label: c.label,
      })),
    [customCategories],
  );

  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [...BASE_FILTERS];
    if (creditAccIds.size > 0) {
      chips.push({ id: "credit", label: "💳 Кредитна" });
    }
    chips.push(...categoryFilters);
    return chips;
  }, [creditAccIds.size, categoryFilters]);

  const searchLower = search.trim().toLowerCase();

  // Sort newest-first, then apply hidden / search / filter predicates.
  const filtered = useMemo<Transaction[]>(() => {
    const base = [...activeTx]
      .filter((t) => !hiddenTxIdSet.has(t.id))
      .sort((a, b) => (b.time || 0) - (a.time || 0));
    return base.filter((t) => {
      const matchSearch =
        !searchLower ||
        (t.description || "").toLowerCase().includes(searchLower);
      const matchFilter =
        filter === "all"
          ? true
          : filter === "income"
            ? t.amount > 0
            : filter === "expense"
              ? t.amount < 0
              : filter === "credit"
                ? creditAccIds.has(t._accountId ?? "")
                : (txCategories[t.id] ?? "") === filter;
      return matchSearch && matchFilter;
    });
  }, [
    activeTx,
    hiddenTxIdSet,
    searchLower,
    filter,
    creditAccIds,
    txCategories,
  ]);

  // ── Handlers ────────────────────────────────────────────────────────
  const openAddSheet = useCallback(() => {
    setSheetState({ open: true, editing: null });
  }, []);

  const openEditSheet = useCallback(
    (tx: { _manualId?: string | number }) => {
      const id = tx._manualId != null ? String(tx._manualId) : null;
      if (!id) return;
      const found = manualExpenses.find((e) => e.id === id);
      if (!found) return;
      setSheetState({ open: true, editing: found });
    },
    [manualExpenses],
  );

  const closeSheet = useCallback(() => setSheetState({ open: false }), []);

  const handleSave = useCallback(
    (payload: ManualExpensePayload) => {
      if (payload.id) {
        updateManualExpense(payload.id, payload);
      } else {
        addManualExpense(payload);
      }
    },
    [addManualExpense, updateManualExpense],
  );

  const handleSwipeDeleteManual = useCallback(
    (tx: { _manualId?: string | number }) => {
      const id = tx._manualId != null ? String(tx._manualId) : null;
      if (id) removeManualExpense(id);
    },
    [removeManualExpense],
  );

  // ── Renderers ───────────────────────────────────────────────────────
  const renderItem = useCallback<ListRenderItem<Transaction>>(
    ({ item, index }) => (
      <TxListItem
        tx={item}
        rowIndex={index}
        accounts={accounts}
        txSplits={txSplits}
        customCategories={customCategories}
        overrideCatId={txCategories[item.id] ?? null}
        hidden={hiddenTxIdSet.has(item.id)}
        onPressManual={openEditSheet}
        onSwipeDeleteManual={handleSwipeDeleteManual}
        onSwipeHideTx={hideTx}
      />
    ),
    [
      accounts,
      txSplits,
      customCategories,
      txCategories,
      hiddenTxIdSet,
      openEditSheet,
      handleSwipeDeleteManual,
      hideTx,
    ],
  );

  const keyExtractor = useCallback((t: Transaction) => t.id, []);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-cream-50">
      <View className="px-4 pt-3 pb-2 gap-3" testID={testID}>
        {/* Header — month nav + add button */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => goMonth(-1)}
              accessibilityRole="button"
              accessibilityLabel="Попередній місяць"
              testID={`${testID}-prev-month`}
              className="w-9 h-9 items-center justify-center rounded-xl active:opacity-60"
            >
              <Text className="text-xl text-stone-500">‹</Text>
            </Pressable>
            <Text className="text-sm font-semibold text-stone-900 capitalize px-2">
              {monthLabel}
            </Text>
            <Pressable
              onPress={() => goMonth(1)}
              disabled={isCurrentMonth}
              accessibilityRole="button"
              accessibilityLabel="Наступний місяць"
              accessibilityState={{ disabled: isCurrentMonth }}
              testID={`${testID}-next-month`}
              className="w-9 h-9 items-center justify-center rounded-xl active:opacity-60"
            >
              <Text
                className={
                  isCurrentMonth
                    ? "text-xl text-stone-300"
                    : "text-xl text-stone-500"
                }
              >
                ›
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={openAddSheet}
            accessibilityRole="button"
            accessibilityLabel="Додати витрату"
            testID={`${testID}-add`}
            className="bg-brand-500 rounded-full h-9 px-4 items-center justify-center active:opacity-80"
          >
            <Text className="text-white text-sm font-semibold">+ Додати</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View className="bg-cream-100 border border-cream-300 rounded-2xl px-3 flex-row items-center">
          <Text className="text-stone-400 mr-2">🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Пошук по транзакціях…"
            placeholderTextColor="#a8a29e"
            className="flex-1 py-2.5 text-sm text-stone-900"
            accessibilityLabel="Пошук транзакцій"
            testID={`${testID}-search`}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch("")}
              accessibilityRole="button"
              accessibilityLabel="Очистити пошук"
              hitSlop={8}
            >
              <Text className="text-stone-400 px-1">✕</Text>
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterChips}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 0, gap: 8 }}
          testID={`${testID}-filters`}
          renderItem={({ item }) => {
            const selected = filter === item.id;
            return (
              <Pressable
                onPress={() => setFilter(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`${testID}-filter-${item.id}`}
                className={
                  selected
                    ? "bg-brand-500 border border-brand-500 rounded-full px-3 h-9 justify-center"
                    : "bg-cream-50 border border-cream-300 rounded-full px-3 h-9 justify-center"
                }
              >
                <Text
                  className={
                    selected
                      ? "text-white text-xs font-semibold"
                      : "text-stone-700 text-xs font-medium"
                  }
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Transaction feed */}
      {filtered.length === 0 ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID={`${testID}-empty`}
        >
          <Text className="text-5xl mb-3">🧾</Text>
          <Text className="text-base font-semibold text-stone-900 mb-1 text-center">
            {searchLower || filter !== "all"
              ? "Нічого не знайдено"
              : "Немає транзакцій за цей місяць"}
          </Text>
          <Text className="text-sm text-stone-500 text-center">
            {searchLower || filter !== "all"
              ? "Спробуйте інший фільтр або очистіть пошук."
              : "Додайте першу витрату — і вона з'явиться тут."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 64 }}
          windowSize={11}
          initialNumToRender={20}
          removeClippedSubviews
          testID={`${testID}-list`}
        />
      )}

      <ManualExpenseSheet
        open={sheetState.open}
        onClose={closeSheet}
        onSave={handleSave}
        initialExpense={
          sheetState.open && sheetState.editing
            ? sheetState.editing
            : null
        }
        testID={`${testID}-sheet`}
      />
    </SafeAreaView>
  );
}
