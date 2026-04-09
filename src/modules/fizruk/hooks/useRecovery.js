import { useMemo } from "react";
import { useExerciseCatalog } from "./useExerciseCatalog";
import { useWorkouts } from "./useWorkouts";

function daysBetween(aMs, bMs) {
  const DAY = 24 * 60 * 60 * 1000;
  return Math.floor((aMs - bMs) / DAY);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function loadPointsForItem(item) {
  if (!item) return 0;
  if (item.type === "strength") {
    const sets = item.sets || [];
    const vol = sets.reduce((s, x) => s + (Number(x.weightKg) || 0) * (Number(x.reps) || 0), 0);
    return vol / 1000;
  }
  if (item.type === "time") {
    return (Number(item.durationSec) || 0) / 300; // 5 min = 1 point
  }
  if (item.type === "distance") {
    return (Number(item.distanceM) || 0) / 1000; // 1 km = 1 point
  }
  return 0;
}

export function useRecovery() {
  const { musclesUk } = useExerciseCatalog();
  const { workouts } = useWorkouts();

  const stats = useMemo(() => {
    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;

    const muscleIds = new Set(Object.keys(musclesUk || {}));
    for (const w of workouts || []) {
      for (const it of w.items || []) {
        for (const m of it.musclesPrimary || []) muscleIds.add(m);
      }
    }

    const by = {};
    for (const id of muscleIds) {
      by[id] = {
        id,
        label: musclesUk?.[id] || id,
        lastAt: null,
        daysSince: null,
        load7d: 0,
        status: "green",
      };
    }

    for (const w of workouts || []) {
      const t = w.startedAt ? Date.parse(w.startedAt) : NaN;
      if (!Number.isFinite(t)) continue;
      const in7d = (now - t) <= WEEK;
      for (const it of w.items || []) {
        const pts = in7d ? loadPointsForItem(it) : 0;
        for (const m of it.musclesPrimary || []) {
          if (!by[m]) by[m] = { id: m, label: musclesUk?.[m] || m, lastAt: null, daysSince: null, load7d: 0, status: "green" };
          by[m].lastAt = by[m].lastAt == null ? t : Math.max(by[m].lastAt, t);
          if (in7d) by[m].load7d += pts;
        }
      }
    }

    for (const m of Object.values(by)) {
      if (m.lastAt != null) {
        m.daysSince = clamp(daysBetween(now, m.lastAt), 0, 999);
      }
      // heuristic statuses
      if (m.lastAt == null) {
        m.status = "green";
      } else if (m.daysSince <= 1) {
        m.status = "red";
      } else if (m.daysSince <= 2) {
        m.status = m.load7d >= 6 ? "red" : "yellow";
      } else if (m.daysSince <= 4) {
        m.status = "yellow";
      } else {
        m.status = "green";
      }
    }

    const list = Object.values(by)
      .filter(x => x.id && x.label)
      .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999) || (b.load7d - a.load7d));

    const ready = list.filter(x => x.lastAt == null || x.status === "green").slice(0, 4);
    const avoid = list.filter(x => x.status === "red").slice(0, 4);

    return { by, list, ready, avoid };
  }, [workouts, musclesUk]);

  return stats;
}

