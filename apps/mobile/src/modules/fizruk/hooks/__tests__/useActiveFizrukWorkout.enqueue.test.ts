/**
 * Cloud-sync wiring tests for `useActiveFizrukWorkout`.
 *
 * Verifies that `setActiveWorkoutId` (and its alias `clearActiveWorkout`)
 * always calls `enqueueChange` with the `FIZRUK_ACTIVE_WORKOUT` key
 * after persisting to MMKV — both when setting a real id and when
 * clearing (null → remove).
 *
 * Only `@/sync/enqueue` is mocked. The real storage layer runs against
 * the in-memory MMKV shim from `jest.setup.js`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import {
  type KeepAwakeAdapter,
  useActiveFizrukWorkout,
} from "../useActiveFizrukWorkout";

const FIZRUK_ACTIVE_WORKOUT = STORAGE_KEYS.FIZRUK_ACTIVE_WORKOUT;

const noopKeepAwake: KeepAwakeAdapter = {
  activate: () => {},
  deactivate: () => {},
};

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useActiveFizrukWorkout — enqueueChange wiring", () => {
  it("setActiveWorkoutId fires enqueueChange when setting a workout id", () => {
    const { result } = renderHook(() =>
      useActiveFizrukWorkout({ keepAwake: noopKeepAwake }),
    );

    act(() => {
      result.current.setActiveWorkoutId("wk-sync-test");
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(FIZRUK_ACTIVE_WORKOUT);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setActiveWorkoutId fires enqueueChange when clearing (null)", () => {
    const { result } = renderHook(() =>
      useActiveFizrukWorkout({ keepAwake: noopKeepAwake }),
    );

    act(() => {
      result.current.setActiveWorkoutId("wk-to-clear");
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.setActiveWorkoutId(null);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(FIZRUK_ACTIVE_WORKOUT);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("clearActiveWorkout fires enqueueChange", () => {
    const { result } = renderHook(() =>
      useActiveFizrukWorkout({ keepAwake: noopKeepAwake }),
    );

    act(() => {
      result.current.setActiveWorkoutId("wk-abc");
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.clearActiveWorkout();
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(FIZRUK_ACTIVE_WORKOUT);
  });
});
