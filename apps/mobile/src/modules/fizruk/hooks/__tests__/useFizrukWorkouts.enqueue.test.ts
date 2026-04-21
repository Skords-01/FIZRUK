/**
 * Cloud-sync wiring tests for `useFizrukWorkouts`.
 *
 * Verifies that every mutator routes through `enqueueChange` with
 * `FIZRUK_WORKOUTS` after a real state change, and stays silent when
 * the mutator targets an unknown id (`next === prev` case).
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useFizrukWorkouts } from "../useFizrukWorkouts";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_WORKOUTS;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useFizrukWorkouts — enqueueChange wiring", () => {
  it("createWorkout fires enqueueChange with FIZRUK_WORKOUTS", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    act(() => {
      result.current.createWorkout();
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("updateWorkout fires when the id exists", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    let id = "";
    act(() => {
      id = result.current.createWorkout().id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.updateWorkout(id, { note: "leg day" });
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("updateWorkout is a silent no-op for an unknown id", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    act(() => {
      result.current.updateWorkout("missing-id", { note: "x" });
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("deleteWorkout fires when the id exists; silent otherwise", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    let id = "";
    act(() => {
      id = result.current.createWorkout().id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.deleteWorkout("missing-id");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.deleteWorkout(id);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("endWorkout fires once on the first end and is silent on the second", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    let id = "";
    act(() => {
      id = result.current.createWorkout().id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.endWorkout(id);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.endWorkout(id); // already-ended → no-op
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("endWorkout is silent for an unknown id", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    act(() => {
      result.current.endWorkout("missing-id");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("addItem fires when workout exists; silent otherwise", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    let wid = "";
    act(() => {
      wid = result.current.createWorkout().id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      const itemId = result.current.addItem("missing-workout", {
        nameUk: "Push-up",
      });
      expect(itemId).toBeNull();
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      const itemId = result.current.addItem(wid, { nameUk: "Push-up" });
      expect(typeof itemId).toBe("string");
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("updateItem and removeItem fire only when both ids exist", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    let wid = "";
    let iid: string | null = null;
    act(() => {
      wid = result.current.createWorkout().id;
      iid = result.current.addItem(wid, { nameUk: "Push-up" });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.updateItem(wid, "missing-item", { nameUk: "x" });
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.updateItem("missing-workout", iid!, { nameUk: "x" });
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.updateItem(wid, iid!, { nameUk: "Pull-up" });
    });
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.removeItem(wid, "missing-item");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.removeItem(wid, iid!);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("restoreWorkout fires once; second restore of the same id is silent", () => {
    const { result } = renderHook(() => useFizrukWorkouts());
    const w = {
      id: "w_restored",
      startedAt: "2026-04-21T10:00:00.000Z",
      endedAt: null,
      items: [],
      groups: [],
      warmup: null,
      cooldown: null,
      note: "",
    };

    act(() => {
      result.current.restoreWorkout(w);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.restoreWorkout(w);
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });
});
