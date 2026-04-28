import type { ReactNode } from "react";
import { cn } from "@shared/lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
  /** Disable entry animation (useful when already inside animated container) */
  disableAnimation?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
  disableAnimation = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4 gap-2" : "py-14 px-6 gap-3",
        // Entry animation with staggered children
        !disableAnimation &&
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-panelHi border border-line text-subtle",
            compact ? "w-10 h-10" : "w-14 h-14",
            // Staggered icon animation
            !disableAnimation &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 motion-safe:duration-300 motion-safe:delay-75",
          )}
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          "font-semibold text-text",
          compact ? "text-sm" : "text-base",
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "text-muted leading-relaxed max-w-xs",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <div
          className={cn(
            "mt-1",
            // Staggered action button animation
            !disableAnimation &&
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:delay-150",
          )}
        >
          {action}
        </div>
      )}
    </div>
  );
}
