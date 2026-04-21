/**
 * Cloud-sync wiring tests for `useWellbeing`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useWellbeing } from "../useWellbeing";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_WELLBEING;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useWellbeing — enqueueChange wiring", () => {
  it("upsertForDate fires when inserting a new entry", () => {
    const { result } = renderHook(() => useWellbeing());
    act(() => {
      result.current.upsertForDate("2026-04-21", { mood: 4, energy: 3 });
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("upsertForDate fires on a real change to an existing entry", () => {
    const { result } = renderHook(() => useWellbeing());
    act(() => {
      result.current.upsertForDate("2026-04-21", { mood: 4 });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.upsertForDate("2026-04-21", { mood: 5 });
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("upsertForDate is a silent no-op when the patch leaves user-visible fields unchanged", () => {
    const { result } = renderHook(() => useWellbeing());
    act(() => {
      result.current.upsertForDate("2026-04-21", { mood: 4, notes: "ok" });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      const entry = result.current.upsertForDate("2026-04-21", {
        mood: 4,
        notes: "ok",
      });
      // Returns the existing entry unchanged.
      expect(entry?.mood).toBe(4);
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("removeForDate fires when an entry exists; silent otherwise", () => {
    const { result } = renderHook(() => useWellbeing());
    act(() => {
      result.current.upsertForDate("2026-04-21", { mood: 4 });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.removeForDate("2026-04-22");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.removeForDate("2026-04-21");
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("clear fires once when there are entries; silent on an empty list", () => {
    const { result } = renderHook(() => useWellbeing());
    act(() => {
      result.current.clear();
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.upsertForDate("2026-04-21", { mood: 4 });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.clear();
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });
});
