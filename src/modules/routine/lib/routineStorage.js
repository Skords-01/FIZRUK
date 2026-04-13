/** Hub «Рутина»: звички, теги, категорії (не-спорт), localStorage */

export const ROUTINE_STORAGE_KEY = "hub_routine_v1";

export const ROUTINE_EVENT = "hub-routine-storage";

export function emitRoutineStorage() {
  try {
    window.dispatchEvent(new CustomEvent(ROUTINE_EVENT));
  } catch {}
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

const defaultState = () => ({
  schemaVersion: 1,
  prefs: {
    showFizrukInCalendar: true,
    tagScope: "routine",
  },
  tags: [],
  categories: [],
  habits: [],
  completions: {},
});

export function loadRoutineState() {
  try {
    const raw = localStorage.getItem(ROUTINE_STORAGE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw);
    return {
      ...defaultState(),
      ...p,
      prefs: { ...defaultState().prefs, ...(p.prefs || {}) },
      tags: Array.isArray(p.tags) ? p.tags : [],
      categories: Array.isArray(p.categories) ? p.categories : [],
      habits: Array.isArray(p.habits) ? p.habits : [],
      completions: typeof p.completions === "object" && p.completions ? p.completions : {},
    };
  } catch {
    return defaultState();
  }
}

export function saveRoutineState(next) {
  try {
    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(next));
    emitRoutineStorage();
  } catch {}
}

export function createTag(state, name) {
  const n = (name || "").trim();
  if (!n) return state;
  const t = { id: uid("tag"), name: n, scope: state.prefs?.tagScope || "routine" };
  const next = { ...state, tags: [...state.tags, t] };
  saveRoutineState(next);
  return next;
}

export function createCategory(state, name, emoji = "") {
  const n = (name || "").trim();
  if (!n) return state;
  const c = { id: uid("cat"), name: n, emoji: emoji || undefined };
  const next = { ...state, categories: [...state.categories, c] };
  saveRoutineState(next);
  return next;
}

export function createHabit(state, { name, emoji = "✓", tagIds = [], categoryId = null } = {}) {
  const n = (name || "").trim();
  if (!n) return state;
  const h = {
    id: uid("hab"),
    name: n,
    emoji: emoji || "✓",
    tagIds: Array.isArray(tagIds) ? tagIds : [],
    categoryId: categoryId || null,
    createdAt: new Date().toISOString(),
    archived: false,
  };
  const next = { ...state, habits: [...state.habits, h], completions: { ...state.completions } };
  saveRoutineState(next);
  return next;
}

export function updateHabit(state, id, patch) {
  const next = {
    ...state,
    habits: state.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
  };
  saveRoutineState(next);
  return next;
}

export function setPref(state, key, value) {
  const next = { ...state, prefs: { ...state.prefs, [key]: value } };
  saveRoutineState(next);
  return next;
}

export function toggleHabitCompletion(state, habitId, dateKey) {
  const cur = Array.isArray(state.completions[habitId]) ? [...state.completions[habitId]] : [];
  const i = cur.indexOf(dateKey);
  if (i >= 0) cur.splice(i, 1);
  else cur.push(dateKey);
  cur.sort();
  const next = {
    ...state,
    completions: { ...state.completions, [habitId]: cur },
  };
  saveRoutineState(next);
  return next;
}

export function deleteTag(state, id) {
  const next = {
    ...state,
    tags: state.tags.filter((t) => t.id !== id),
    habits: state.habits.map((h) => ({
      ...h,
      tagIds: (h.tagIds || []).filter((x) => x !== id),
    })),
  };
  saveRoutineState(next);
  return next;
}
