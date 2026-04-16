/** Спільні константи UI модуля «Рутина» (без JSX) */

export const ROUTINE_THEME = {
  eyebrow: "text-routine-eyebrow",
  /** Заголовок картки-огляду (hero) */
  heroKicker: "text-routine-kicker/90 dark:text-routine",
  /** Картки метрик у hero */
  statCard:
    "rounded-2xl bg-panel/70 border border-routine-line/50 dark:border-routine/20 p-3 text-center shadow-sm",
  statCardEmerald:
    "rounded-2xl bg-panel/70 border border-emerald-200/60 dark:border-emerald-700/40 p-3 text-center shadow-sm",
  emptyStateWarm:
    "rounded-2xl border border-routine-line/60 dark:border-routine/25 bg-routine-surface3 dark:bg-routine/8 p-6 text-center shadow-card",
  linkAccent:
    "font-semibold text-routine-strong dark:text-routine underline decoration-routine-ring/80 dark:decoration-routine/50",
  habitRowAccent: "border-l-routine",
  iconBox: "bg-routine-surface dark:bg-routine/12 border-routine-line/80 dark:border-routine/30 text-routine-strong dark:text-routine",
  navActive: "text-routine-strong dark:text-routine",
  navBar: "bg-routine-nav",
  chipOn: "border-routine-ring dark:border-routine/40 bg-routine-surface2 dark:bg-routine/15 text-text shadow-sm",
  chipOff:
    "border-line/60 bg-panel text-muted hover:text-text hover:bg-panelHi",
  dot: "bg-routine-nav",
  monthSel:
    "bg-routine-surface2 dark:bg-routine/15 border-routine-ring dark:border-routine/40 ring-1 ring-routine-line/50 dark:ring-routine/30",
  done: "border-routine/45 bg-routine-surface dark:bg-routine/12 text-routine-done dark:text-routine",
  primary: "!bg-routine hover:!bg-routine-hover !text-white border-0 shadow-md",
};

export const ROUTINE_TIME_MODES = [
  { id: "today", label: "Сьогодні" },
  { id: "tomorrow", label: "Завтра" },
  { id: "week", label: "Тиждень" },
  { id: "month", label: "Місяць" },
];

export const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Щодня" },
  { value: "weekdays", label: "Будні (пн–пт)" },
  { value: "weekly", label: "Обрані дні тижня" },
  { value: "monthly", label: "Щомісяця (число; лютий — останній день)" },
  { value: "once", label: "Одноразово (одна дата)" },
];

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
