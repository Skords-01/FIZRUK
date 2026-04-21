import { describe, expect, it } from "vitest";

import {
  REMINDER_PRESETS,
  emptyHabitDraft,
  habitDraftToPatch,
  normalizeReminderTimes,
  routineTodayDate,
} from "./drafts.js";

describe("routine-domain/drafts", () => {
  it("normalizeReminderTimes uses reminderTimes if valid", () => {
    expect(normalizeReminderTimes({ reminderTimes: ["08:00", "xx"] })).toEqual([
      "08:00",
    ]);
  });

  it("normalizeReminderTimes falls back to legacy timeOfDay", () => {
    expect(normalizeReminderTimes({ timeOfDay: "13:00" })).toEqual(["13:00"]);
    expect(normalizeReminderTimes({ timeOfDay: "nope" })).toEqual([]);
    expect(normalizeReminderTimes({})).toEqual([]);
  });

  it("habitDraftToPatch normalizes times and endDate", () => {
    const p = habitDraftToPatch({
      name: "  Test  ",
      emoji: "",
      tagIds: ["t1"],
      categoryId: "",
      recurrence: "daily",
      startDate: "2026-01-01",
      endDate: " ",
      timeOfDay: "20:00",
      reminderTimes: [" 08:00 ", "bad", "13:00:00"],
      weekdays: [1, 2, 3],
    });
    expect(p.name).toBe("Test");
    expect(p.emoji).toBe("✓");
    expect(p.categoryId).toBe(null);
    expect(p.endDate).toBe(null);
    expect(p.reminderTimes).toEqual(["08:00", "13:00"]);
    expect(p.timeOfDay).toBe("08:00");
    expect(p.weekdays).toEqual([1, 2, 3]);
  });

  it("emptyHabitDraft returns today-normalised draft", () => {
    const draft = emptyHabitDraft();
    expect(draft.name).toBe("");
    expect(draft.emoji).toBe("✓");
    expect(draft.recurrence).toBe("daily");
    expect(draft.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(draft.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("routineTodayDate pins noon", () => {
    const d = routineTodayDate();
    expect(d.getHours()).toBe(12);
    expect(d.getMinutes()).toBe(0);
  });

  it("REMINDER_PRESETS exposes 5 distinct presets", () => {
    expect(REMINDER_PRESETS).toHaveLength(5);
    const ids = new Set(REMINDER_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(5);
    for (const p of REMINDER_PRESETS) {
      expect(p.times.every((t) => /^\d{2}:\d{2}$/.test(t))).toBe(true);
    }
  });
});
