/**
 * Cloud-sync wiring tests for `useMeasurements`.
 *
 * Verifies that every mutator calls `enqueueChange` with
 * `FIZRUK_MEASUREMENTS` after a real state change, and that `update`
 * stays silent when the given id is not found (`next === prev` case).
 *
 * Only `@/sync/enqueue` is mocked. The real `useLocalStorage` +
 * in-memory MMKV shim from `jest.setup.js` handle persistence.
 */
import { act, renderHook } from "@testing-library/react-native";

import { emptyMeasurementDraft } from "@sergeant/fizruk-domain/domain";
import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useMeasurements } from "../useMeasurements";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_MEASUREMENTS;

function makeDraft() {
  return emptyMeasurementDraft("2026-04-21T10:00:00Z");
}

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useMeasurements — enqueueChange wiring", () => {
  it("add fires enqueueChange with the measurements key", () => {
    const { result } = renderHook(() => useMeasurements());

    act(() => {
      result.current.add(makeDraft());
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("update fires enqueueChange when the entry exists", () => {
    const { result } = renderHook(() => useMeasurements());

    let entryId: string;
    act(() => {
      const entry = result.current.add(makeDraft());
      entryId = entry.id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.update(entryId, makeDraft());
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("update is a no-op (silent) when the entry id does not exist", () => {
    const { result } = renderHook(() => useMeasurements());

    act(() => {
      result.current.update("non-existent-id", makeDraft());
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("remove is a no-op (silent) when the entry id does not exist", () => {
    const { result } = renderHook(() => useMeasurements());

    act(() => {
      result.current.remove("non-existent-id");
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("remove fires enqueueChange with the measurements key", () => {
    const { result } = renderHook(() => useMeasurements());

    let entryId: string;
    act(() => {
      const entry = result.current.add(makeDraft());
      entryId = entry.id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.remove(entryId);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("clear fires enqueueChange with the measurements key", () => {
    const { result } = renderHook(() => useMeasurements());

    act(() => {
      result.current.add(makeDraft());
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.clear();
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });
});
