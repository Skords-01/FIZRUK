/**
 * Спільна логіка відновлення м'язів (useRecovery + прогноз дат).
 * @param {number} nowMs — момент «зараз» для розрахунку (для прогнозу — майбутнє).
 */
function daysBetween(aMs, bMs) {
  const DAY = 24 * 60 * 60 * 1000;
  return Math.floor((aMs - bMs) / DAY);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function loadPointsForItem(item) {
  if (!item) return 0;
  if (item.type === "strength") {
    const sets = item.sets || [];
    const tonnage = sets.reduce(
      (s, x) => s + (Number(x.weightKg) || 0) * (Number(x.reps) || 0),
      0,
    );
    const setCount = sets.filter(
      (x) => (Number(x.reps) || 0) > 0 || (Number(x.weightKg) || 0) > 0,
    ).length;
    return tonnage / 1000 + setCount * 0.15;
  }
  if (item.type === "time") {
    const sec = Number(item.durationSec) || 0;
    return sec / 240;
  }
  if (item.type === "distance") {
    const km = (Number(item.distanceM) || 0) / 1000;
    const min = (Number(item.durationSec) || 0) / 60;
    return km + min / 30;
  }
  return 0;
}

/**
 * Compute a recovery multiplier from recent daily log entries.
 * Prioritises the most recent entry with sleep data and most recent entry with
 * energy data independently (they may be logged on different days).
 * Poor sleep (<6h) or low energy (≤2/5) slows recovery by 20–30%
 * (multiplier > 1 increases effective fatigue time).
 * Good sleep/energy speeds recovery (multiplier < 1).
 * Falls back to 1.0 when no sleep/energy data is present.
 * Returns a value between 0.7 (well-rested) and 1.4 (exhausted).
 */
export function computeWellbeingMultiplier(dailyLogEntries = []) {
  if (!dailyLogEntries || dailyLogEntries.length === 0) return 1.0;

  const sorted = [...dailyLogEntries].sort((a, b) =>
    (b.at || "").localeCompare(a.at || ""),
  );

  // Find the most recent entry that has sleep data
  const latestSleepEntry = sorted.find(
    (e) => e.sleepHours != null && Number.isFinite(Number(e.sleepHours)),
  );
  // Find the most recent entry that has energy data
  const latestEnergyEntry = sorted.find(
    (e) => e.energyLevel != null && Number.isFinite(Number(e.energyLevel)),
  );

  let multiplier = 1.0;

  if (latestSleepEntry) {
    const hrs = Number(latestSleepEntry.sleepHours);
    if (hrs < 5) multiplier += 0.3;
    else if (hrs < 6) multiplier += 0.2;
    else if (hrs < 7) multiplier += 0.1;
    else if (hrs >= 8) multiplier -= 0.1;
  }

  if (latestEnergyEntry) {
    const energy = Number(latestEnergyEntry.energyLevel);
    if (energy <= 1) multiplier += 0.3;
    else if (energy <= 2) multiplier += 0.2;
    else if (energy <= 2.5) multiplier += 0.15;
    else if (energy >= 4.5) multiplier -= 0.15;
    else if (energy >= 4) multiplier -= 0.1;
  }

  return clamp(multiplier, 0.7, 1.4);
}

/**
 * Повертає map id м'яза → стан (як у useRecovery().by).
 * @param {Array} dailyLogEntries - recent daily log entries for wellbeing modifiers
 */
export function computeRecoveryBy(
  workouts = [],
  musclesUk = {},
  nowMs = Date.now(),
  dailyLogEntries = [],
) {
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;

  const wellbeingMult = computeWellbeingMultiplier(dailyLogEntries);

  const muscleIds = new Set(Object.keys(musclesUk || {}));
  for (const w of workouts || []) {
    for (const it of w.items || []) {
      for (const m of it.musclesPrimary || []) muscleIds.add(m);
      for (const m of it.musclesSecondary || []) muscleIds.add(m);
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
      fatigue: 0,
      status: "green",
    };
  }

  for (const w of workouts || []) {
    const t = w.startedAt ? Date.parse(w.startedAt) : NaN;
    if (!Number.isFinite(t)) continue;
    const in7d = nowMs - t <= WEEK;
    for (const it of w.items || []) {
      const ptsBase = loadPointsForItem(it);
      const ageDays = Math.max(0, (nowMs - t) / DAY);
      const decay = Math.exp(-ageDays / 2.2);

      const apply = (m, wgt) => {
        if (!m) return;
        if (!by[m]) {
          by[m] = {
            id: m,
            label: musclesUk?.[m] || m,
            lastAt: null,
            daysSince: null,
            load7d: 0,
            fatigue: 0,
            status: "green",
          };
        }
        by[m].lastAt = by[m].lastAt == null ? t : Math.max(by[m].lastAt, t);
        if (in7d) by[m].load7d += ptsBase * wgt;
        by[m].fatigue += ptsBase * wgt * decay * wellbeingMult;
      };

      for (const m of it.musclesPrimary || []) apply(m, 1);
      for (const m of it.musclesSecondary || []) apply(m, 0.55);
    }
  }

  for (const m of Object.values(by)) {
    if (m.lastAt != null) {
      m.daysSince = clamp(daysBetween(nowMs, m.lastAt), 0, 999);
    }
    if (m.lastAt == null) m.status = "green";
    else if (m.daysSince <= 1) m.status = "red";
    else if (m.fatigue >= 4.5) m.status = "red";
    else if (m.fatigue >= 2.2 || m.daysSince <= 3) m.status = "yellow";
    else m.status = "green";
  }

  return by;
}

/** «Повне» відновлення: зелений статус (fatigue < 2.2, daysSince > 3 у логіці вище). */
export function isFullyRecovered(row) {
  return row?.status === "green" && row?.lastAt != null;
}
