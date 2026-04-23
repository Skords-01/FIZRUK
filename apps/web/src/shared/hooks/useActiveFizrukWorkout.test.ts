// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveFizrukWorkout } from "./useActiveFizrukWorkout";

const ACTIVE_KEY = "fizruk_active_workout_id_v1";
const WORKOUTS_KEY = "fizruk_workouts_v1";

function seedWorkouts(
  workouts: Array<{ id: string; endedAt: string | null }>,
  { legacyArray = false }: { legacyArray?: boolean } = {},
) {
  const payload = legacyArray ? workouts : { schemaVersion: 1, workouts };
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(payload));
}

describe("useActiveFizrukWorkout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when no active id is persisted", () => {
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBeNull();
  });

  it("returns the active id when the referenced workout exists and is in progress", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    seedWorkouts([{ id: "w-1", endedAt: null }]);
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBe("w-1");
  });

  it("treats the pointer as stale when the referenced workout is missing and clears the key", () => {
    localStorage.setItem(ACTIVE_KEY, "w-gone");
    seedWorkouts([{ id: "w-other", endedAt: null }]);
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  it("treats the pointer as stale when the referenced workout is already ended and clears the key", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    seedWorkouts([{ id: "w-1", endedAt: "2026-04-20T10:00:00Z" }]);
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  it("clears the pointer when there are no workouts persisted at all", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  it("accepts the legacy plain-array workouts shape", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    seedWorkouts([{ id: "w-1", endedAt: null }], { legacyArray: true });
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBe("w-1");
  });

  it("keeps the pointer when the workouts JSON is corrupt (fail-open)", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    localStorage.setItem(WORKOUTS_KEY, "{not valid json");
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBe("w-1");
    // Key is preserved because we cannot prove it's stale.
    expect(localStorage.getItem(ACTIVE_KEY)).toBe("w-1");
  });

  it("picks up a same-tab write via the polling fallback", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBeNull();

    act(() => {
      localStorage.setItem(ACTIVE_KEY, "w-late");
      seedWorkouts([{ id: "w-late", endedAt: null }]);
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current).toBe("w-late");
  });

  it("reacts to another tab ending the workout (storage event re-validates)", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    seedWorkouts([{ id: "w-1", endedAt: null }]);
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBe("w-1");

    act(() => {
      // Simulate the other tab flipping endedAt on the workouts list.
      seedWorkouts([{ id: "w-1", endedAt: "2026-04-20T12:00:00Z" }]);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: WORKOUTS_KEY,
          newValue: localStorage.getItem(WORKOUTS_KEY),
          storageArea: localStorage,
        }),
      );
    });
    expect(result.current).toBeNull();
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  it("reacts to a logout that clears storage entirely", () => {
    localStorage.setItem(ACTIVE_KEY, "w-1");
    seedWorkouts([{ id: "w-1", endedAt: null }]);
    const { result } = renderHook(() => useActiveFizrukWorkout());
    expect(result.current).toBe("w-1");

    act(() => {
      localStorage.clear();
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: null,
          storageArea: localStorage,
        }),
      );
    });
    expect(result.current).toBeNull();
  });
});
