/**
 * Cloud-sync wiring tests for `useFinykTransactionsStore`. Mirrors the
 * `assetsStore.enqueue.test.ts` pattern: only `@/sync/enqueue` is
 * mocked; the real MMKV-backed storage layer runs through the
 * in-memory shim registered in `jest.setup.js`.
 */
import { act, renderHook } from "@testing-library/react-native";

import {
  FINYK_BACKUP_STORAGE_KEYS,
  FINYK_STORAGE_KEYS,
} from "@sergeant/finyk-domain";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useFinykTransactionsStore } from "../transactionsStore";

const KEY_MANUAL = FINYK_STORAGE_KEYS.transactions;
const KEY_TX_CATS = FINYK_BACKUP_STORAGE_KEYS.txCategories;
const KEY_TX_SPLITS = FINYK_BACKUP_STORAGE_KEYS.txSplits;
const KEY_HIDDEN_TXS = FINYK_BACKUP_STORAGE_KEYS.hiddenTxIds;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useFinykTransactionsStore — enqueueChange wiring", () => {
  it("addManualExpense fires enqueueChange with the manual-expenses key", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    act(() => {
      result.current.addManualExpense({
        description: "обід",
        amount: 250,
        category: "🍴 їжа",
        date: "2026-04-21T12:00:00.000Z",
      });
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_MANUAL);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
    expect(result.current.manualExpenses).toHaveLength(1);
  });

  it("updateManualExpense fires enqueueChange after addManualExpense", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    let createdId = "";
    act(() => {
      const created = result.current.addManualExpense({
        description: "обід",
        amount: 250,
        category: "🍴 їжа",
        date: "2026-04-21T12:00:00.000Z",
      });
      createdId = created.id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.updateManualExpense(createdId, {
        description: "обід (правка)",
        amount: 300,
        category: "🍴 їжа",
        date: "2026-04-21T12:00:00.000Z",
      });
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_MANUAL);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
    expect(result.current.manualExpenses[0]?.amount).toBe(300);
  });

  it("removeManualExpense fires enqueueChange with the manual-expenses key", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    let createdId = "";
    act(() => {
      const created = result.current.addManualExpense({
        description: "кава",
        amount: 80,
        category: "🍔 кафе та ресторани",
        date: "2026-04-21T09:00:00.000Z",
      });
      createdId = created.id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.removeManualExpense(createdId);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_MANUAL);
    expect(result.current.manualExpenses).toHaveLength(0);
  });

  it("hideTx and unhideTx both fire enqueueChange with the hidden-txs key", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    act(() => {
      result.current.hideTx("tx-1");
    });
    expect(mockEnqueueChange).toHaveBeenLastCalledWith(KEY_HIDDEN_TXS);
    expect(result.current.hiddenTxIds).toContain("tx-1");

    act(() => {
      result.current.unhideTx("tx-1");
    });
    expect(mockEnqueueChange).toHaveBeenLastCalledWith(KEY_HIDDEN_TXS);
    expect(result.current.hiddenTxIds).not.toContain("tx-1");
  });

  it("hideTx is a no-op for an already-hidden id (no extra enqueue)", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    act(() => {
      result.current.hideTx("tx-9");
    });
    const after = mockEnqueueChange.mock.calls.length;

    act(() => {
      result.current.hideTx("tx-9");
    });
    expect(mockEnqueueChange.mock.calls.length).toBe(after);
  });

  it("overrideCategory fires enqueueChange with the tx-cats key", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    act(() => {
      result.current.overrideCategory("tx-1", "food");
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_TX_CATS);
    expect(result.current.txCategories["tx-1"]).toBe("food");
  });

  it("overrideCategory(null) clears the entry and fires enqueueChange", () => {
    const { result } = renderHook(() =>
      useFinykTransactionsStore({
        txCategories: { "tx-1": "food" },
      }),
    );
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.overrideCategory("tx-1", null);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_TX_CATS);
    expect(result.current.txCategories["tx-1"]).toBeUndefined();
  });

  it("setSplitTx fires enqueueChange with the tx-splits key", () => {
    const { result } = renderHook(() => useFinykTransactionsStore());

    act(() => {
      result.current.setSplitTx("tx-1", [
        { categoryId: "food", amount: 100 },
        { categoryId: "shopping", amount: 50 },
      ]);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_TX_SPLITS);
    expect(result.current.txSplits["tx-1"]).toHaveLength(2);
  });

  it("setSplitTx with empty array clears the entry", () => {
    const { result } = renderHook(() =>
      useFinykTransactionsStore({
        txSplits: { "tx-1": [{ categoryId: "food", amount: 100 }] },
      }),
    );
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.setSplitTx("tx-1", []);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_TX_SPLITS);
    expect(result.current.txSplits["tx-1"]).toBeUndefined();
  });
});
