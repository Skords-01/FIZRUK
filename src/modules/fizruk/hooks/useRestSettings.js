import { useCallback, useState } from "react";

const KEY = "fizruk_rest_settings_v1";

/**
 * Default rest time in seconds per exercise category.
 * compound: chest/back/legs/glutes/full_body
 * isolation: shoulders/arms/core
 * cardio: cardio
 */
export const REST_DEFAULTS = {
  compound: 90,
  isolation: 60,
  cardio: 30,
};

export const REST_CATEGORY_LABELS = {
  compound: "Базові (compound)",
  isolation: "Ізолюючі",
  cardio: "Кардіо",
};

const ISOLATION_GROUPS = ["shoulders", "arms", "core"];
const CARDIO_GROUPS = ["cardio"];

/** Classify a primaryGroup into compound/isolation/cardio. */
export function getRestCategory(primaryGroup) {
  if (!primaryGroup) return "compound";
  if (CARDIO_GROUPS.includes(primaryGroup)) return "cardio";
  if (ISOLATION_GROUPS.includes(primaryGroup)) return "isolation";
  return "compound";
}

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Hook that provides user-configurable default rest durations per exercise type.
 * Settings are stored in localStorage.
 */
export function useRestSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = safeParse(raw, {});
      return { ...REST_DEFAULTS, ...parsed };
    } catch {
      return { ...REST_DEFAULTS };
    }
  });

  const persist = useCallback((next) => {
    setSettings(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const updateSetting = useCallback(
    (category, sec) => {
      persist({ ...settings, [category]: Number(sec) });
    },
    [settings, persist],
  );

  const getDefaultForGroup = useCallback(
    (primaryGroup) => {
      const cat = getRestCategory(primaryGroup);
      return settings[cat] ?? REST_DEFAULTS[cat];
    },
    [settings],
  );

  return { settings, updateSetting, getDefaultForGroup };
}
