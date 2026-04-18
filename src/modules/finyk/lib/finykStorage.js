/**
 * Централізований storage-шар модуля ФІНІК.
 *
 * Тонкий wrapper над shared `createModuleStorage(prefix)` — вся логіка
 * safe-parse, debounce + skip-if-equal, guaranteed flush on page hide
 * живе у `@shared/lib/createModuleStorage.js`. Тут лишився тільки доменний API
 * (getTransactions/saveTransactions, getCategories/saveCategories,
 * getBudget/saveBudget) і реекспорт менеджера міграцій.
 *
 * Ключі залишаються ті самі, що вже використовуються застосунком. Міграції
 * "finto_*" → "finyk_*" виконуються через shared `storageManager`.
 */

import { createModuleStorage } from "@shared/lib/createModuleStorage.js";
import { finykStorageManager } from "./storageManager.js";

/** Стандартні ключі доменних сутностей ФІНІК. Не змінювати без міграції. */
export const FINYK_STORAGE_KEYS = Object.freeze({
  transactions: "finyk_manual_expenses_v1",
  categories: "finyk_custom_cats_v1",
  budget: "finyk_budgets",
});

const storage = createModuleStorage({ name: "finyk" });

export const {
  readJSON,
  writeJSON,
  readRaw,
  writeRaw,
  removeItem,
  writeJSONDebounced,
  flushPendingWrites,
} = storage;

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
