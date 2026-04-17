export const HUB_PREFS_KEY = "hub_prefs_v1";

export function safeParseLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

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
