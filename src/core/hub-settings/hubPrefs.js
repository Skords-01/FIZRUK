export const HUB_PREFS_KEY = "hub_prefs_v1";

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
    /* noop */
  }
}
