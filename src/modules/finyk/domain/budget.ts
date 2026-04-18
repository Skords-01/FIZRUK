import { getTxStatAmount } from "../utils";
import type {
  Budget,
  MonthBudgetSummary,
  MonthlyPlan,
  RemainingBudget,
  Transaction,
  TxSplitsMap,
} from "./types";

export type { Budget, MonthBudgetSummary, RemainingBudget } from "./types";

export function calculateRemainingBudget(
  budget: Pick<Budget, "limit"> & Partial<Budget>,
  spent: number,
): RemainingBudget {
  const limit = budget.limit || 0;
  const remaining = Math.max(0, limit - spent);
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  return { remaining, pct, isOver: spent > limit };
}

export function calculateSafeToSpendPerDay(
  remaining: number,
  daysLeft: number,
): number {
  if (daysLeft <= 0) return 0;
  return Math.max(0, Math.floor(remaining / daysLeft));
}

export interface MonthBudgetOptions {
  excludedTxIds?: Set<string> | Iterable<string>;
  txSplits?: TxSplitsMap;
  monthlyPlan?: MonthlyPlan;
}

export function getMonthBudgetSummary(
  transactions: readonly Transaction[] | null | undefined,
  {
    excludedTxIds = new Set<string>(),
    txSplits = {},
    monthlyPlan = {},
  }: MonthBudgetOptions = {},
): MonthBudgetSummary {
  const excluded =
    excludedTxIds instanceof Set
      ? excludedTxIds
      : new Set<string>(excludedTxIds || []);
  const statTx = Array.isArray(transactions)
    ? transactions.filter((t) => t && !excluded.has(t.id))
    : [];

  const totalFact = Math.round(
    statTx
      .filter((t) => t.amount < 0)
      .reduce((s, t) => s + getTxStatAmount(t, txSplits), 0),
  );

  const planIncome = Number(monthlyPlan?.income || 0);
  const planExpense = Number(monthlyPlan?.expense || 0);
  const remaining = Math.max(0, planExpense - totalFact);
  const now = new Date();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const safePerDay = calculateSafeToSpendPerDay(remaining, daysLeft);

  return {
    totalPlan: planExpense,
    planIncome,
    totalFact,
    totalRemaining: remaining,
    safePerDay,
    isOverall: planExpense > 0 && totalFact > planExpense,
    daysLeft,
  };
}
