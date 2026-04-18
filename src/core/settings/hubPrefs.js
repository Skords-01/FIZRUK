import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@shared/lib/storageKeys.js";

export const HUB_PREFS_KEY = STORAGE_KEYS.HUB_PREFS;

export function loadHubPrefs() {
  try {
    const raw = localStorage.getItem(HUB_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveHubPref(key, value) {
  try {
    const prefs = loadHubPrefs();
    localStorage.setItem(
      HUB_PREFS_KEY,
      JSON.stringify({ ...prefs, [key]: value }),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: HUB_PREFS_KEY }));
  } catch {
    /* quota or serialization — safe to ignore */
  }
}

/**
 * Reactive single-pref hook that stays in sync with cross-tab `storage`
 * events and the same-tab StorageEvent dispatched by `saveHubPref`.
 */
export function useHubPref(key, defaultValue) {
  const read = () => {
    const prefs = loadHubPrefs();
    return key in prefs ? prefs[key] : defaultValue;
  };
  const [value, setValue] = useState(read);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === HUB_PREFS_KEY || e.key === null) setValue(read());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (next) => {
    setValue(next);
    saveHubPref(key, next);
  };

  return [value, update];
}
