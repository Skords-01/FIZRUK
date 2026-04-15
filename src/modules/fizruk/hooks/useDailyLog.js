import { useCallback, useEffect, useMemo, useState } from "react";

const KEY = "fizruk_daily_log_v1";

function uid() {
  return `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse(raw) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Daily log entry schema:
 * {
 *   id: string,
 *   at: ISO string (date of the entry),
 *   weightKg: number | null,
 *   sleepHours: number | null,
 *   energyLevel: 1-5 | null,
 *   moodScore: 1-5 | null,
 *   note: string,
 * }
 */
export function useDailyLog() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEntries(safeParse(raw));
    } catch {}
  }, []);

  const persist = useCallback((next) => {
    setEntries(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addEntry = useCallback(
    (data) => {
      const e = {
        id: uid(),
        at: new Date().toISOString(),
        weightKg: null,
        sleepHours: null,
        energyLevel: null,
        moodScore: null,
        note: "",
        ...data,
      };
      persist([e, ...entries]);
      return e;
    },
    [entries, persist],
  );

  const deleteEntry = useCallback(
    (id) => {
      persist(entries.filter((e) => e.id !== id));
    },
    [entries, persist],
  );

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.at || "").localeCompare(a.at || "")),
    [entries],
  );

  /** Last N entries with a given field filled. */
  const recentWith = useCallback(
    (field, limit = 30) => {
      return sorted
        .filter((e) => e[field] != null && e[field] !== "")
        .slice(0, limit);
    },
    [sorted],
  );

  /** Latest single entry. */
  const latest = sorted[0] || null;

  return { entries: sorted, latest, addEntry, deleteEntry, recentWith };
}
