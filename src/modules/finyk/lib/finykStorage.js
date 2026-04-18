/**
 * Централізований storage-шар модуля ФІНІК.
 *
 * Мета: прибрати хаотичні виклики localStorage з компонентів/хуків і забезпечити:
 *  - безпечне читання/запис (try/catch + дефолтні значення);
 *  - debounce запису + пропуск ідентичних значень;
 *  - стабільну інтеграцію з існуючими міграціями (`storageManager.js`) та ключами.
 *
 * Ключі залишаються ті самі, що вже використовуються застосунком — цей модуль
 * лише агрегує доступ до них. Міграції з "finto_*" у "finyk_*" виконуються
 * через shared `storageManager` та `finyk_002_rename_finto_user_data`.
 */

import { safeJsonSet } from "@shared/lib/storageQuota.js";
import { finykStorageManager } from "./storageManager.js";

/** Стандартні ключі доменних сутностей ФІНІК. Не змінювати без міграції. */
export const FINYK_STORAGE_KEYS = Object.freeze({
  transactions: "finyk_manual_expenses_v1",
  categories: "finyk_custom_cats_v1",
  budget: "finyk_budgets",
});

const DEFAULT_DEBOUNCE_MS = 500;

function reportStorageError(scope, error) {
  try {
    console.warn(`[finykStorage] ${scope}`, error);
  } catch {
    /* ignore logging errors */
  }
}

function hasLocalStorage() {
  return typeof localStorage !== "undefined" && localStorage !== null;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value === undefined ? null : value);
  } catch (error) {
    reportStorageError("JSON.stringify", error);
    return undefined;
  }
}

/** Остання успішно записана JSON-репрезентація — для change-detection. */
const lastWrittenCache = new Map();
/** Значення, що очікують запису (по ключу). */
const pendingValues = new Map();
/** Таймери debounce (по ключу). */
const pendingTimers = new Map();

/**
 * Безпечне читання JSON зі сховища.
 * Повертає `fallback` якщо значення відсутнє, сховище недоступне, або JSON биті.
 */
export function readJSON(key, fallback = null) {
  if (!hasLocalStorage()) return fallback;
  const k = String(key);
  let raw;
  try {
    raw = localStorage.getItem(k);
  } catch (error) {
    reportStorageError(`read("${k}")`, error);
    return fallback;
  }
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === undefined ? fallback : parsed;
  } catch (error) {
    reportStorageError(`JSON.parse("${k}")`, error);
    return fallback;
  }
}

/**
 * Безпечний запис JSON у сховище. Використовує shared квотний guard.
 * Повертає true у разі успіху.
 */
export function writeJSON(key, value) {
  if (!hasLocalStorage()) return false;
  const k = String(key);
  try {
    const res = safeJsonSet(k, value);
    if (res && res.ok) {
      const serialized = safeStringify(value);
      if (serialized !== undefined) lastWrittenCache.set(k, serialized);
      return true;
    }
    reportStorageError(`write("${k}")`, res?.reason || res?.error || "unknown");
    return false;
  } catch (error) {
    reportStorageError(`write("${k}")`, error);
    return false;
  }
}

/** Безпечне читання сирого рядка (без JSON.parse). */
export function readRaw(key, fallback = null) {
  if (!hasLocalStorage()) return fallback;
  const k = String(key);
  try {
    const v = localStorage.getItem(k);
    return v === null || v === undefined ? fallback : v;
  } catch (error) {
    reportStorageError(`readRaw("${k}")`, error);
    return fallback;
  }
}

/** Безпечний запис сирого рядка. */
export function writeRaw(key, value) {
  if (!hasLocalStorage()) return false;
  const k = String(key);
  try {
    localStorage.setItem(k, String(value ?? ""));
    return true;
  } catch (error) {
    reportStorageError(`writeRaw("${k}")`, error);
    return false;
  }
}

/** Безпечне видалення ключа. */
export function removeItem(key) {
  if (!hasLocalStorage()) return false;
  const k = String(key);
  // Скасовуємо відкладений запис, якщо є — інакше пізніше перезапише null.
  const timer = pendingTimers.get(k);
  if (timer) {
    clearTimeout(timer);
    pendingTimers.delete(k);
  }
  pendingValues.delete(k);
  lastWrittenCache.delete(k);
  try {
    localStorage.removeItem(k);
    return true;
  } catch (error) {
    reportStorageError(`remove("${k}")`, error);
    return false;
  }
}

/**
 * Запис із debounce + пропуском, якщо значення не змінилось.
 * Якщо сторінка ховається/закривається — буфер гарантовано скидається.
 * @param {string} key
 * @param {unknown} value
 * @param {number} [delay=500]
 */
export function writeJSONDebounced(key, value, delay = DEFAULT_DEBOUNCE_MS) {
  if (!hasLocalStorage()) return;
  const k = String(key);
  const nextStr = safeStringify(value);
  if (nextStr === undefined) return;

  const lastStr = lastWrittenCache.get(k);
  const hasPending = pendingTimers.has(k);
  if (!hasPending && lastStr === nextStr) {
    return; // Дані не змінились — запис не потрібен.
  }

  pendingValues.set(k, value);

  if (pendingTimers.has(k)) {
    clearTimeout(pendingTimers.get(k));
  }
  const timer = setTimeout(() => {
    pendingTimers.delete(k);
    if (!pendingValues.has(k)) return;
    const pending = pendingValues.get(k);
    pendingValues.delete(k);
    writeJSON(k, pending);
  }, Math.max(0, Number(delay) || DEFAULT_DEBOUNCE_MS));
  pendingTimers.set(k, timer);
}

/** Скинути всі відкладені записи негайно. */
export function flushPendingWrites() {
  const keys = Array.from(pendingTimers.keys());
  for (const k of keys) {
    const timer = pendingTimers.get(k);
    if (timer) clearTimeout(timer);
    pendingTimers.delete(k);
    if (pendingValues.has(k)) {
      const value = pendingValues.get(k);
      pendingValues.delete(k);
      writeJSON(k, value);
    }
  }
}

// Гарантований flush при закритті вкладки / втраті видимості.
if (typeof window !== "undefined") {
  try {
    const flush = () => {
      try {
        flushPendingWrites();
      } catch {
        /* ignore flush errors */
      }
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    }
  } catch {
    /* ignore listener errors */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Доменний API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Повертає список вручну доданих транзакцій (finyk_manual_expenses_v1).
 * @returns {Array<object>}
 */
export function getTransactions() {
  const v = readJSON(FINYK_STORAGE_KEYS.transactions, []);
  return Array.isArray(v) ? v : [];
}

/**
 * Зберігає список вручну доданих транзакцій (debounced + skip-if-equal).
 * @param {Array<object>} transactions
 */
export function saveTransactions(transactions) {
  const value = Array.isArray(transactions) ? transactions : [];
  writeJSONDebounced(FINYK_STORAGE_KEYS.transactions, value);
}

/**
 * Повертає кастомні категорії користувача (finyk_custom_cats_v1).
 * @returns {Array<object>}
 */
export function getCategories() {
  const v = readJSON(FINYK_STORAGE_KEYS.categories, []);
  return Array.isArray(v) ? v : [];
}

/**
 * Зберігає кастомні категорії користувача (debounced + skip-if-equal).
 * @param {Array<object>} categories
 */
export function saveCategories(categories) {
  const value = Array.isArray(categories) ? categories : [];
  writeJSONDebounced(FINYK_STORAGE_KEYS.categories, value);
}

/**
 * Повертає конфіг бюджетів (finyk_budgets).
 * @returns {Array<object>}
 */
export function getBudget() {
  const v = readJSON(FINYK_STORAGE_KEYS.budget, []);
  return Array.isArray(v) ? v : [];
}

/**
 * Зберігає конфіг бюджетів (debounced + skip-if-equal).
 * @param {Array<object>} budget
 */
export function saveBudget(budget) {
  const value = Array.isArray(budget) ? budget : [];
  writeJSONDebounced(FINYK_STORAGE_KEYS.budget, value);
}

// Реекспорт менеджера міграцій — щоб споживачі імпортували все з одного модуля.
export { finykStorageManager };
