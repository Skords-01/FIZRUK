// Публічна поверхня пакета `@sergeant/routine-domain` — DOM-free
// бізнес-логіка Рутини, яку споживають `apps/web` і `apps/mobile`
// без платформних залежностей (`localStorage`, `window`, `document`).
//
// Phase 5 / PR 2 — перший зріз: типи, константи, чисті helper-и для
// date-keys, schedule, streaks, habit-order та habit-draft утиліт.
// Storage-bound модулі (`routineStorage`, `hubCalendarAggregate`,
// `finykSubscriptionCalendar`) лишаються у `apps/web/src/modules/routine/lib/`
// до моменту, коли аналогічний MMKV-shim з'явиться в `apps/mobile`.

export * from "./types.js";
export * from "./constants.js";
export * from "./dateKeys.js";
export * from "./completionNoteKey.js";
export * from "./habitOrder.js";
export * from "./schedule.js";
export * from "./streaks.js";
export * from "./drafts.js";
