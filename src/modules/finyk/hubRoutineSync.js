/** Подія для перемальовки календаря Рутини після змін підписок/кешу Фініка. */
export const HUB_FINYK_ROUTINE_SYNC_EVENT = "hub-finyk-routine-sync";

/** Оновлення кешу транзакцій Monobank (див. useMonobank). */
export const HUB_FINYK_TX_CACHE_EVENT = "hub-finyk-cache-updated";

export function notifyFinykRoutineCalendarSync() {
  try {
    window.dispatchEvent(new CustomEvent(HUB_FINYK_ROUTINE_SYNC_EVENT));
  } catch {
    /* noop */
  }
}
