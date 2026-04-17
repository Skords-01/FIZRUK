import { cn } from "../../lib/cn";

/**
 * Sergeant Design System — Badge Component
 *
 * Small status indicators, tags, and labels.
 *
 * Variants:
 * - default: Neutral badge
 * - success, warning, danger, info: Status badges
 * - brand, finyk, fizruk, routine, nutrition: Module-branded badges
 * - outline: Transparent with border
 */

const variants = {
  // Neutral
  default: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",

  // Status
  success: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",

  // Module-branded
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400",
  finyk: "bg-brand-100 text-finyk dark:bg-brand-900/30 dark:text-brand-400",
  fizruk: "bg-teal-100 text-fizruk dark:bg-teal-900/30 dark:text-teal-400",
  routine: "bg-coral-100 text-routine dark:bg-coral-900/30 dark:text-coral-400",
  nutrition: "bg-lime-100 text-nutrition dark:bg-lime-900/30 dark:text-lime-400",

  // Outline variants
  outline: "bg-transparent border border-line text-muted",
  "outline-success":
    "bg-transparent border border-brand-300 text-brand-600 dark:border-brand-700 dark:text-brand-400",
  "outline-danger":
    "bg-transparent border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400",
};

const sizes = {
  xs: "px-1.5 py-0.5 text-2xs",
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function Badge({
  variant = "default",
  size = "sm",
  icon,
  dot,
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "success" || variant === "brand"
              ? "bg-brand-500"
              : variant === "warning"
                ? "bg-amber-500"
                : variant === "danger"
                  ? "bg-red-500"
                  : variant === "info"
                    ? "bg-sky-500"
                    : "bg-current"
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/**
 * StatusBadge — Pre-configured badges for common statuses
 */
export function StatusBadge({ status, className, ...props }) {
  const statusConfig = {
    active: { variant: "success", children: "Активно" },
    inactive: { variant: "default", children: "Неактивно" },
    pending: { variant: "warning", children: "Очікує" },
    error: { variant: "danger", children: "Помилка" },
    completed: { variant: "success", children: "Завершено" },
    paused: { variant: "info", children: "Пауза" },
    ...props,
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return <Badge {...config} dot className={className} {...props} />;
}

/**
 * CountBadge — Numeric counter badge (notifications, unread counts)
 */
export function CountBadge({
  count,
  max = 99,
  variant = "danger",
  size = "xs",
  className,
}) {
  if (!count || count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge
      variant={variant}
      size={size}
      className={cn(
        "min-w-[18px] h-[18px] justify-center tabular-nums",
        className
      )}
    >
      {displayCount}
    </Badge>
  );
}

/**
 * StreakBadge — Gamification streak indicator (Duolingo-style)
 */
export function StreakBadge({ streak, className }) {
  if (!streak || streak <= 0) return null;

  return (
    <Badge
      variant="warning"
      size="sm"
      className={cn("gap-1", className)}
      icon={
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-amber-500"
        >
          <path d="M12 2c.5 0 1 .2 1.4.5l.1.1c1.8 1.8 3 4.2 3 6.9 0 1.5-.3 2.9-.9 4.1l3.1 3.1c.4.4.4 1 0 1.4s-1 .4-1.4 0l-2.8-2.8c-1.4 1.1-3.1 1.7-5 1.7-4.4 0-8-3.6-8-8s3.6-8 8-8zm0 2c-3.3 0-6 2.7-6 6s2.7 6 6 6c1.4 0 2.7-.5 3.8-1.3l-2.5-2.5c-.4-.4-.4-1 0-1.4s1-.4 1.4 0l2.5 2.5c.5-.9.8-1.9.8-3 0-2-1-3.8-2.4-5.1-.3-.3-.7-.4-1.1-.4l-.5.2z" />
        </svg>
      }
    >
      {streak} днів
    </Badge>
  );
}
