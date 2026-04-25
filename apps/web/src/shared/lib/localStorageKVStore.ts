import type { KVStore } from "@sergeant/shared";

/**
 * Web platform adapter for the shared `KVStore` interface. Pure helpers
 * in `@sergeant/shared/lib/*` accept a `KVStore` instance instead of
 * touching `localStorage` directly so they can run in tests (memory
 * store) and on mobile (MMKV) without changes.
 *
 * Wraps every call in a try/catch — quota exceeded, private browsing,
 * SecurityError on cross-origin iframes, and the SSR `localStorage`-is-
 * `undefined` case all need to degrade silently rather than crash the
 * page.
 */
export const localStorageKVStore: KVStore = {
  getString(key) {
    try {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem(key)
        : null;
    } catch {
      return null;
    }
  },
  setString(key, value) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch {
      /* noop — quota / private-mode / SSR */
    }
  },
  remove(key) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {
      /* noop */
    }
  },
};
