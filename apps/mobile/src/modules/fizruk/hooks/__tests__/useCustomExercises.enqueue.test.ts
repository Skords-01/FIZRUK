/**
 * Cloud-sync wiring tests for `useCustomExercises`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useCustomExercises } from "../useCustomExercises";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_CUSTOM_EXERCISES;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useCustomExercises — enqueueChange wiring", () => {
  it("add fires enqueueChange with the custom-exercises key", () => {
    const { result } = renderHook(() => useCustomExercises());
    act(() => {
      result.current.add({ nameUk: "Дзеркальна тяга" });
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("update fires when the id exists", () => {
    const { result } = renderHook(() => useCustomExercises());
    let id = "";
    act(() => {
      id = result.current.add({ nameUk: "Foo" }).id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      const updated = result.current.update(id, { nameUk: "Bar" });
      expect(updated?.nameUk).toBe("Bar");
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("update is silent for an unknown id", () => {
    const { result } = renderHook(() => useCustomExercises());
    act(() => {
      const updated = result.current.update("missing-id", { nameUk: "x" });
      expect(updated).toBeNull();
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("remove fires when the id exists; silent otherwise", () => {
    const { result } = renderHook(() => useCustomExercises());
    let id = "";
    act(() => {
      id = result.current.add({ nameUk: "Foo" }).id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.remove("missing-id");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.remove(id);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("clear fires once when there are entries; silent on an empty list", () => {
    const { result } = renderHook(() => useCustomExercises());
    act(() => {
      result.current.clear();
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.add({ nameUk: "Foo" });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.clear();
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });
});
