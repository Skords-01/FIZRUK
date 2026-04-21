/**
 * Cloud-sync wiring tests for `useMonthlyPlan`.
 *
 * Verifies that `setDayTemplate`, `setReminder`, and `setReminderEnabled`
 * call `enqueueChange` with `FIZRUK_MONTHLY_PLAN` after a real state
 * change, and stay silent when the domain reducer returns `prev`
 * unchanged (`next === prev`).
 *
 * Note: `defaultMonthlyPlanState()` starts with `reminderEnabled: true`
 * and `reminderHour: 9, reminderMinute: 0`, so no-op tests use values
 * that match the defaults.
 *
 * Only `@/sync/enqueue` is mocked. The real storage layer uses the
 * in-memory MMKV shim from `jest.setup.js`.
 */
import { act, renderHook } from "@testing-library/react-native";

import { MONTHLY_PLAN_STORAGE_KEY } from "@sergeant/fizruk-domain/constants";

import { _getMMKVInstance } from "@/lib/storage";

const mockEnqueueChange = jest.fn();

jest.mock("@/sync/enqueue", () => ({
  enqueueChange: (...args: unknown[]) => mockEnqueueChange(...args),
}));

import { useMonthlyPlan } from "../useMonthlyPlan";

beforeEach(() => {
  _getMMKVInstance().clearAll();
  mockEnqueueChange.mockClear();
});

describe("useMonthlyPlan — enqueueChange wiring", () => {
  it("setDayTemplate fires enqueueChange when a template is assigned", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setDayTemplate("2026-04-21", "tmpl-push");
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(MONTHLY_PLAN_STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setDayTemplate is a no-op (silent) when the value is already set to the same template", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setDayTemplate("2026-04-21", "tmpl-push");
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.setDayTemplate("2026-04-21", "tmpl-push");
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("setReminder fires enqueueChange when the time changes", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setReminder(8, 30);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(MONTHLY_PLAN_STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setReminder is a no-op (silent) when the time is unchanged", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setReminder(9, 0);
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.setReminder(9, 0);
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("setReminderEnabled fires enqueueChange when toggling off (default is on)", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setReminderEnabled(false);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(MONTHLY_PLAN_STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setReminderEnabled fires enqueueChange when toggling on after off", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setReminderEnabled(false);
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.setReminderEnabled(true);
    });

    expect(mockEnqueueChange).toHaveBeenCalledWith(MONTHLY_PLAN_STORAGE_KEY);
    expect(mockEnqueueChange).toHaveBeenCalledTimes(1);
  });

  it("setReminderEnabled is a no-op (silent) when the flag is unchanged (default true → true)", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setReminderEnabled(true);
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });

  it("setReminderEnabled is a no-op (silent) when called with same value again", () => {
    const { result } = renderHook(() => useMonthlyPlan());

    act(() => {
      result.current.setReminderEnabled(false);
    });
    mockEnqueueChange.mockClear();

    act(() => {
      result.current.setReminderEnabled(false);
    });

    expect(mockEnqueueChange).not.toHaveBeenCalled();
  });
});
