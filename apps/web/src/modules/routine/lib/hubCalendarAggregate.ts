import { safeReadLS } from "@shared/lib/storage.js";
import {
  MONTHLY_PLAN_STORAGE_KEY,
  TEMPLATES_STORAGE_KEY,
} from "@sergeant/fizruk-domain";
import {
  completionNoteKey,
  dateKeyFromDate,
  enumerateDateKeys,
  habitScheduledOnDate,
  parseDateKey,
  sortHabitsByOrder,
} from "@sergeant/routine-domain";
import { buildFinykSubscriptionEvents } from "./finykSubscriptionCalendar.js";

// Re-export pure helpers under their historical names so the web
// call-sites that `import { dateKeyFromDate } from "./hubCalendarAggregate.js"`
// keep compiling unchanged after the Phase 5 / PR 2 extraction.
export {
  dateKeyFromDate,
  parseDateKey,
  enumerateDateKeys,
  habitScheduledOnDate,
};

export const FIZRUK_GROUP_LABEL = "Фізрук";

export function loadMonthlyPlanDays() {
  const p = safeReadLS<{ days?: Record<string, { templateId?: string }> }>(
    MONTHLY_PLAN_STORAGE_KEY,
    {},
  );
  return typeof p?.days === "object" && p.days ? p.days : {};
}

export function loadTemplateNameById() {
  const map = new Map<string, string>();
  const arr = safeReadLS<Array<{ id?: string; name?: string }>>(
    TEMPLATES_STORAGE_KEY,
    [],
  );
  if (Array.isArray(arr)) {
    for (const t of arr) {
      if (t?.id && t?.name) map.set(t.id, String(t.name));
    }
  }
  return map;
}

function tagLabelsForHabit(state, habit) {
  const ids = habit.tagIds || [];
  const labels = ids
    .map((id) => state.tags.find((t) => t.id === id)?.name)
    .filter(Boolean);
  if (habit.categoryId) {
    const c = state.categories.find((x) => x.id === habit.categoryId);
    if (c?.name) labels.push(c.name);
  }
  return labels.length ? labels : ["Без тегу"];
}

export function buildHubCalendarEvents(
  state,
  range,
  { showFizruk = true, showFinykSubs = true } = {},
) {
  const events = [];
  const { startKey, endKey } = range;
  const days = enumerateDateKeys(startKey, endKey);
  const planDays = loadMonthlyPlanDays();
  const tplNames = loadTemplateNameById();

  if (showFizruk) {
    for (const date of days) {
      const tid = planDays[date]?.templateId;
      if (!tid) continue;
      const title = tplNames.get(tid) || "Тренування за планом";
      events.push({
        id: `fizruk_${date}_${tid}`,
        source: "fizruk_plan",
        date,
        title,
        subtitle: "План Фізрука",
        tagLabels: [FIZRUK_GROUP_LABEL],
        sortKey: `${date} 0 fizruk`,
        fizruk: true,
        sourceKind: "fizruk",
      });
    }
  }

  const notes =
    state.completionNotes && typeof state.completionNotes === "object"
      ? state.completionNotes
      : {};
  const activeHabits = sortHabitsByOrder(
    state.habits.filter((h) => !h.archived),
    state.habitOrder || [],
  );
  for (const date of days) {
    for (const h of activeHabits) {
      if (!habitScheduledOnDate(h, date)) continue;
      const completions = state.completions[h.id] || [];
      const completed = completions.includes(date);
      const tagLabels = tagLabelsForHabit(state, h);
      const t = h.timeOfDay ? String(h.timeOfDay).trim() : "";
      const timePart = t ? ` · ${t}` : "";
      const nk = completionNoteKey(h.id, date);
      const note = notes[nk] ? String(notes[nk]) : "";
      events.push({
        id: `habit_${h.id}_${date}`,
        source: "routine_habit",
        date,
        title: `${h.emoji} ${h.name}`,
        subtitle: completed ? `Зроблено${timePart}` : `Звичка${timePart}`,
        tagLabels,
        sortKey: `${date} 1 ${h.name}`,
        habitId: h.id,
        completed,
        note,
        sourceKind: "habit",
        timeOfDay: t,
      });
    }
  }

  if (
    showFinykSubs &&
    state.prefs?.showFinykSubscriptionsInCalendar !== false
  ) {
    events.push(...buildFinykSubscriptionEvents(range));
  }

  events.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "uk"));
  return events;
}

export function countEventsByDate(events) {
  const map = new Map();
  for (const e of events) {
    map.set(e.date, (map.get(e.date) || 0) + 1);
  }
  return map;
}
