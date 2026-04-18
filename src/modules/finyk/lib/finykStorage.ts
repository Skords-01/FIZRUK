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
import type { Budget, Category, Transaction } from "../domain/types";

/** Стандартні ключі доменних сутностей ФІНІК. Не змінювати без міграції. */
export const FINYK_STORAGE_KEYS = Object.freeze({
  transactions: "finyk_manual_expenses_v1",
  categories: "finyk_custom_cats_v1",
  budget: "finyk_budgets",
} as const);

export type FinykStorageKey =
  (typeof FINYK_STORAGE_KEYS)[keyof typeof FINYK_STORAGE_KEYS];

const DEFAULT_DEBOUNCE_MS = 500;

function reportStorageError(scope: string, error: unknown): void {
  try {
    console.warn(`[finykStorage] ${scope}`, error);
  } catch {
    /* ignore logging errors */
  }
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined" && localStorage !== null;
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value === undefined ? null : value);
  } catch (error) {
    reportStorageError("JSON.stringify", error);
    return undefined;
  }
}

/** Остання успішно записана JSON-репрезентація — для change-detection. */
const lastWrittenCache = new Map<string, string>();
/** Значення, що очікують запису (по ключу). */
const pendingValues = new Map<string, unknown>();
/** Таймери debounce (по ключу). */
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Безпечне читання JSON зі сховища.
 * Повертає `fallback` якщо значення відсутнє, сховище недоступне, або JSON биті.
 */
export function readJSON<T = unknown>(
  key: string,
  fallback: T | null = null as T | null,
): T | null {
  if (!hasLocalStorage()) return fallback;
  const k = String(key);
  let raw: string | null;
  try {
    raw = localStorage.getItem(k);
  } catch (error) {
    reportStorageError(`read("${k}")`, error);
    return fallback;
  }
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw) as T | undefined;
    return parsed === undefined ? fallback : (parsed as T);
  } catch (error) {
    reportStorageError(`JSON.parse("${k}")`, error);
    return fallback;
  }
}

/**
 * Безпечний запис JSON у сховище. Використовує shared квотний guard.
 * Повертає true у разі успіху.
 */
export function writeJSON(key: string, value: unknown): boolean {
  if (!hasLocalStorage()) return false;
  const k = String(key);
  try {
    const res = safeJsonSet(k, value) as
      | { ok?: boolean; reason?: string; error?: unknown }
      | undefined;
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
export function readRaw(
  key: string,
  fallback: string | null = null,
): string | null {
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
export function writeRaw(key: string, value: unknown): boolean {
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
export function removeItem(key: string): boolean {
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
 */
export function writeJSONDebounced(
  key: string,
  value: unknown,
  delay: number = DEFAULT_DEBOUNCE_MS,
): void {
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

  const existing = pendingTimers.get(k);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(
    () => {
      pendingTimers.delete(k);
      if (!pendingValues.has(k)) return;
      const pending = pendingValues.get(k);
      pendingValues.delete(k);
      writeJSON(k, pending);
    },
    Math.max(0, Number(delay) || DEFAULT_DEBOUNCE_MS),
  );
  pendingTimers.set(k, timer);
}

/** Скинути всі відкладені записи негайно. */
export function flushPendingWrites(): void {
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
    const flush = (): void => {
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
 */
export function getTransactions(): Transaction[] {
  const v = readJSON<Transaction[]>(FINYK_STORAGE_KEYS.transactions, []);
  return Array.isArray(v) ? v : [];
}

/**
 * Зберігає список вручну доданих транзакцій (debounced + skip-if-equal).
 */
export function saveTransactions(
  transactions: readonly Transaction[] | null | undefined,
): void {
  const value = Array.isArray(transactions) ? transactions : [];
  writeJSONDebounced(FINYK_STORAGE_KEYS.transactions, value);
}

/**
 * Повертає кастомні категорії користувача (finyk_custom_cats_v1).
 */
export function getCategories(): Category[] {
  const v = readJSON<Category[]>(FINYK_STORAGE_KEYS.categories, []);
  return Array.isArray(v) ? v : [];
}

/**
 * Зберігає кастомні категорії користувача (debounced + skip-if-equal).
 */
export function saveCategories(
  categories: readonly Category[] | null | undefined,
): void {
  const value = Array.isArray(categories) ? categories : [];
  writeJSONDebounced(FINYK_STORAGE_KEYS.categories, value);
}

/**
 * Повертає конфіг бюджетів (finyk_budgets).
 */
export function getBudget(): Budget[] {
  const v = readJSON<Budget[]>(FINYK_STORAGE_KEYS.budget, []);
  return Array.isArray(v) ? v : [];
}

/**
 * Зберігає конфіг бюджетів (debounced + skip-if-equal).
 */
export function saveBudget(budget: readonly Budget[] | null | undefined): void {
  const value = Array.isArray(budget) ? budget : [];
  writeJSONDebounced(FINYK_STORAGE_KEYS.budget, value);
}

// Реекспорт менеджера міграцій — щоб споживачі імпортували все з одного модуля.
export { finykStorageManager };
