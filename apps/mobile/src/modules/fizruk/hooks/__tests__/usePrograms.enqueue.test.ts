/**
 * Cloud-sync wiring tests for `usePrograms`.
 *
 * Verifies that `activateProgram`, `deactivateProgram`, and
 * `toggleProgram` call `enqueueChange` with `FIZRUK_ACTIVE_PROGRAM`
 * after every real state write, and that `activateProgram` stays
 * silent when the given program id does not exist in the catalogue
 * (`persist` is never reached).
 *
 * Uses the real `PROGRAM_CATALOGUE` so the hook's `resolveTodaySession`
 * memo can resolve fully. Only `@/sync/enqueue` is mocked; the real
 * storage layer uses the in-memory MMKV shim from `jest.setup.js`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { usePrograms } from "../usePrograms";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_ACTIVE_PROGRAM;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("usePrograms — enqueueChange wiring", () => {
  it("activateProgram fires enqueueChange when the id exists in the catalogue", () => {
    const { result } = renderHook(() => usePrograms());

    act(() => {
      result.current.activateProgram("ppl");
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("activateProgram is silent when the id is not in the catalogue", () => {
    const { result } = renderHook(() => usePrograms());

    act(() => {
      result.current.activateProgram("prog-nonexistent");
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("deactivateProgram fires enqueueChange", () => {
    const { result } = renderHook(() => usePrograms());

    act(() => {
      result.current.activateProgram("ppl");
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.deactivateProgram();
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("toggleProgram fires enqueueChange when activating", () => {
    const { result } = renderHook(() => usePrograms());

    act(() => {
      result.current.toggleProgram("ppl");
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("toggleProgram fires enqueueChange when deactivating", () => {
    const { result } = renderHook(() => usePrograms());

    act(() => {
      result.current.activateProgram("ppl");
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.toggleProgram("ppl");
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });
});
