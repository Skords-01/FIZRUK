/**
 * Cloud-sync wiring tests for `usePlanTemplate`.
 *
 * The slot stores a single object (or `null`); deep-equality guards
 * keep cloud-sync quiet on idempotent re-saves.
 */
import { act, renderHook } from "@testing-library/react-native";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { usePlanTemplate } from "../usePlanTemplate";

const STORAGE_KEY = STORAGE_KEYS.FIZRUK_PLAN_TEMPLATE;

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("usePlanTemplate — enqueueChange wiring", () => {
  it("setPlanTemplate fires when storing a fresh value", () => {
    const { result } = renderHook(() => usePlanTemplate());
    act(() => {
      const changed = result.current.setPlanTemplate({
        name: "Hypertrophy",
        weekday: { "0": null, "1": "tmpl-push" },
      });
      expect(changed).toBe(true);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setPlanTemplate is a silent no-op when the value is deep-equal to the current one", () => {
    const { result } = renderHook(() => usePlanTemplate());
    act(() => {
      result.current.setPlanTemplate({ name: "Hypertrophy" });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      const changed = result.current.setPlanTemplate({ name: "Hypertrophy" });
      expect(changed).toBe(false);
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("setPlanTemplate(null) on a populated slot fires once; clearing twice is silent", () => {
    const { result } = renderHook(() => usePlanTemplate());
    act(() => {
      result.current.setPlanTemplate({ name: "Strength" });
    });
    mockEnqueueChange.mockClear();

    act(() => {
      const changed = result.current.clearPlanTemplate();
      expect(changed).toBe(true);
    });
    expect(mockEnqueueChange).toHaveBeenCalledWith(STORAGE_KEY);
    mockEnqueueChange.mockClear();

    act(() => {
      const changed = result.current.clearPlanTemplate();
      expect(changed).toBe(false);
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("setPlanTemplate(null) is silent when the slot is already null (initial state)", () => {
    const { result } = renderHook(() => usePlanTemplate());
    act(() => {
      const changed = result.current.setPlanTemplate(null);
      expect(changed).toBe(false);
    });
    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });
});
