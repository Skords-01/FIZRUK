/**
 * Pure habit-schedule predicate.
 *
 * Extracted from `hubCalendarAggregate.ts` — whether a given habit
 * falls on a given `YYYY-MM-DD` date-key, respecting:
 *   - lifetime bounds (`startDate` / `endDate` / `archived`);
 *   - `recurrence` mode (`daily` / `weekdays` / `weekly` / `monthly` /
 *     `once`);
 *   - `weekdays` array for weekly mode (Monday-first, 0–6);
 *   - month-anchor day-of-month for monthly mode, snapped to the last
 *     day of short months.
 */

import { isoWeekdayFromDateKey, parseDateKey } from "./dateKeys.js";
import type { Habit } from "./types.js";

export function habitScheduledOnDate(habit: Habit, dateKey: string): boolean {
  if (habit.archived) return false;
  const start =
    habit.startDate ||
    (habit.createdAt ? String(habit.createdAt).slice(0, 10) : dateKey);
  const end = habit.endDate || null;
  if (dateKey < start) return false;
  if (end && dateKey > end) return false;
  const r = habit.recurrence || "daily";
  if (r === "once") return dateKey === start;
  if (r === "daily") return true;
  if (r === "weekdays") {
    const wd = isoWeekdayFromDateKey(dateKey);
    return wd >= 0 && wd <= 4;
  }
  if (r === "weekly") {
    const days =
      Array.isArray(habit.weekdays) && habit.weekdays.length > 0
        ? habit.weekdays
        : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(isoWeekdayFromDateKey(dateKey));
  }
  if (r === "monthly") {
    const anchorDom = parseDateKey(start).getDate();
    const d = parseDateKey(dateKey);
    const y = d.getFullYear();
    const m = d.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const scheduledDay = Math.min(anchorDom, daysInMonth);
    return d.getDate() === scheduledDay;
  }
  return true;
}
