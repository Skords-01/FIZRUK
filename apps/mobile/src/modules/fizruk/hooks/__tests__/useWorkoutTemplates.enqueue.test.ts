/**
 * Cloud-sync wiring tests for `useWorkoutTemplates`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useWorkoutTemplates } from "../useWorkoutTemplates";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_TEMPLATES;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useWorkoutTemplates — enqueueChange wiring", () => {
  it("addTemplate fires enqueueChange with the templates key", () => {
    const { result } = renderHook(() => useWorkoutTemplates());
    act(() => {
      result.current.addTemplate("Push day", ["ex1", "ex2"]);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("updateTemplate fires when id exists; silent otherwise", () => {
    const { result } = renderHook(() => useWorkoutTemplates());
    let id = "";
    act(() => {
      id = result.current.addTemplate("Push", []).id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.updateTemplate("missing-id", { name: "x" });
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.updateTemplate(id, { name: "Push v2" });
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("removeTemplate fires when id exists; silent otherwise", () => {
    const { result } = renderHook(() => useWorkoutTemplates());
    let id = "";
    act(() => {
      id = result.current.addTemplate("Push", []).id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.removeTemplate("missing-id");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.removeTemplate(id);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("restoreTemplate fires once; second restore of same id is silent", () => {
    const { result } = renderHook(() => useWorkoutTemplates());
    const tpl = {
      id: "tpl_restored",
      name: "Restored",
      exerciseIds: [],
      groups: [],
      updatedAt: "2026-04-20T10:00:00.000Z",
    };

    act(() => {
      result.current.restoreTemplate(tpl);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.restoreTemplate(tpl);
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("markTemplateUsed fires when id exists; silent otherwise", () => {
    const { result } = renderHook(() => useWorkoutTemplates());
    let id = "";
    act(() => {
      id = result.current.addTemplate("Push", []).id;
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.markTemplateUsed("missing-id");
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();

    act(() => {
      result.current.markTemplateUsed(id);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("addTemplate throws on empty name (and never enqueues)", () => {
    const { result } = renderHook(() => useWorkoutTemplates());
    expect(() => {
      act(() => {
        result.current.addTemplate("   ", []);
      });
    }).toThrow();
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });
});
