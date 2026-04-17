import { describe, it, expect, vi } from "vitest";
import {
  loadRoutineState,
  saveRoutineState,
  ROUTINE_STORAGE_KEY,
} from "./routineStorage.js";

if (!globalThis.localStorage) {
  let store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe("routine/routineStorage", () => {
  it("loadRoutineState returns default when empty", () => {
    localStorage.removeItem(ROUTINE_STORAGE_KEY);
    const s = loadRoutineState();
    expect(s).toBeTruthy();
    expect(Array.isArray(s.habits)).toBe(true);
  });

  it("saveRoutineState returns false on storage failure", () => {
    const spy = vi
      .spyOn(globalThis.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    const ok = saveRoutineState(loadRoutineState());
    expect(ok).toBe(false);
    spy.mockRestore();
  });
});
