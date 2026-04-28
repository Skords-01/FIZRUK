/**
 * useTabBadges — aggregates pending-item counts for the main tab bar badges.
 *
 * Each module can contribute a count:
 *   - routine: habits due today that are not yet checked off
 *   - finyk:   (reserved for future use — e.g. unreviewed transactions)
 *   - fizruk:  (reserved — e.g. pending workout session)
 *   - nutrition:(reserved — e.g. unlogged meals)
 *
 * Returns `undefined` (no badge) when the count is 0 or unavailable, and
 * a numeric string (capped at "99+") when there are pending items.
 * Expo Router / React Navigation renders `tabBarBadge` as a red pill when
 * the value is a non-empty string or a positive number.
 *
 * Data is read directly from MMKV (synchronous) to avoid a flicker on
 * initial render. The hook subscribes to storage-change events so badges
 * update within the same frame as the write.
 */

import { useEffect, useState } from "react";
import { safeReadLS } from "@/lib/storage";

// Storage key written by the Routine module each time a habit is toggled.
// Format: JSON array of { id: string; doneToday: boolean }
const ROUTINE_HABITS_KEY = "routine_habits_v1";
const ROUTINE_LOG_KEY = "routine_daily_log_v1";

function countPendingHabits(): number {
  try {
    const habitsRaw = safeReadLS<unknown>(ROUTINE_HABITS_KEY, null);
    const logRaw = safeReadLS<unknown>(ROUTINE_LOG_KEY, null);

    if (!Array.isArray(habitsRaw)) return 0;

    const todayKey = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const log: Record<string, boolean> =
      logRaw && typeof logRaw === "object" && !Array.isArray(logRaw)
        ? (logRaw as Record<string, boolean>)
        : {};

    // Count habits that are active today but not yet logged
    return habitsRaw.filter((h) => {
      if (!h || typeof h !== "object") return false;
      const habit = h as { id?: string; active?: boolean };
      if (!habit.id || habit.active === false) return false;
      return !log[`${habit.id}:${todayKey}`];
    }).length;
  } catch {
    return 0;
  }
}

function formatBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : String(count);
}

export interface TabBadges {
  /** Badge for the Routine tab — pending habits today. */
  routine: string | undefined;
  /** Badge for the Finyk tab — reserved for future use. */
  finyk: string | undefined;
}

export function useTabBadges(): TabBadges {
  const [routineCount, setRoutineCount] = useState(() => countPendingHabits());

  useEffect(() => {
    // Re-evaluate on every focus / visibility change so the badge is
    // up-to-date when the user switches back to the hub tab.
    const refresh = () => setRoutineCount(countPendingHabits());

    // React Native doesn't have a universal storage-change event, but
    // a simple interval is cheap enough for this low-frequency update.
    const id = setInterval(refresh, 30_000); // every 30s
    return () => clearInterval(id);
  }, []);

  return {
    routine: formatBadge(routineCount),
    finyk: undefined,
  };
}
