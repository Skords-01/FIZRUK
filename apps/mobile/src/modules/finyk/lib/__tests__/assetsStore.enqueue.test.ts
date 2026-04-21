/**
 * Cloud-sync wiring tests for `useFinykAssetsStore`.
 *
 * Verifies that every mutator calls `enqueueChange` with the correct
 * MMKV key after persisting state, mirroring the routineStore pattern.
 * Only `@/sync/enqueue` is mocked — the real storage layer runs against
 * the in-memory MMKV shim registered in `jest.setup.js`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { FINYK_BACKUP_STORAGE_KEYS } from "@sergeant/finyk-domain";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useFinykAssetsStore } from "../assetsStore";

const KEY_ASSETS = FINYK_BACKUP_STORAGE_KEYS.manualAssets;
const KEY_DEBTS = FINYK_BACKUP_STORAGE_KEYS.manualDebts;
const KEY_RECV = FINYK_BACKUP_STORAGE_KEYS.receivables;
const KEY_HIDDEN = FINYK_BACKUP_STORAGE_KEYS.hiddenAccounts;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useFinykAssetsStore — enqueueChange wiring", () => {
  it("setManualAssets fires enqueueChange with the assets key", () => {
    const { result } = renderHook(() => useFinykAssetsStore());

    act(() => {
      result.current.setManualAssets([
        { id: "a1", name: "Car", valueUAH: 500_000 } as never,
      ]);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_ASSETS);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setManualDebts fires enqueueChange with the debts key", () => {
    const { result } = renderHook(() => useFinykAssetsStore());

    act(() => {
      result.current.setManualDebts([
        { id: "d1", label: "Loan", amountUAH: 10_000 } as never,
      ]);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_DEBTS);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setReceivables fires enqueueChange with the receivables key", () => {
    const { result } = renderHook(() => useFinykAssetsStore());

    act(() => {
      result.current.setReceivables([
        { id: "r1", label: "Debt from friend", amountUAH: 500 } as never,
      ]);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_RECV);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setHiddenAccounts fires enqueueChange with the hidden key", () => {
    const { result } = renderHook(() => useFinykAssetsStore());

    act(() => {
      result.current.setHiddenAccounts(["acc-123", "acc-456"]);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(KEY_HIDDEN);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("each setter fires exactly one enqueueChange call", () => {
    const { result } = renderHook(() => useFinykAssetsStore());

    act(() => {
      result.current.setManualAssets([]);
    });
    act(() => {
      result.current.setManualDebts([]);
    });
    act(() => {
      result.current.setReceivables([]);
    });
    act(() => {
      result.current.setHiddenAccounts([]);
    });

    expect(mockEnqueueChange).toHaveBeenCalledTimes(4);
    expect(mockEnqueueChange).toHaveBeenNthCalledWith(1, KEY_ASSETS);
    expect(mockEnqueueChange).toHaveBeenNthCalledWith(2, KEY_DEBTS);
    expect(mockEnqueueChange).toHaveBeenNthCalledWith(3, KEY_RECV);
    expect(mockEnqueueChange).toHaveBeenNthCalledWith(4, KEY_HIDDEN);
  });
});
