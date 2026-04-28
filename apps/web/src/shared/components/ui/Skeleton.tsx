import type { CSSProperties } from "react";
import { cn } from "../../lib/cn";

export interface SkeletonProps {
  className?: string;
  /** Use shimmer effect instead of pulse (more premium feel) */
  shimmer?: boolean;
  /** Inline style passthrough (e.g. staggered `animationDelay`). */
  style?: CSSProperties;
}

/**
 * Base skeleton loader with optional shimmer effect.
 * `motion-safe:animate-pulse` respects `prefers-reduced-motion: reduce`
 * (WCAG 2.3.3 + Apple HIG reduced motion compliance).
 */
export function Skeleton({ className, shimmer = false, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-panelHi rounded-2xl",
        shimmer ? "relative overflow-hidden" : "motion-safe:animate-pulse",
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      {shimmer && (
        <div
          className="absolute inset-0 -translate-x-full motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function SkeletonText({
  className,
  shimmer = false,
  style,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-panelHi rounded-lg h-3",
        shimmer ? "relative overflow-hidden" : "motion-safe:animate-pulse",
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      {shimmer && (
        <div
          className="absolute inset-0 -translate-x-full motion-safe:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Pre-composed skeleton for module cards (HubDashboard, StatusRow).
 * Matches the visual structure of real cards for seamless loading states.
 */
export function SkeletonCard({
  className,
  shimmer = false,
  style,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-panel p-4 space-y-3",
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton shimmer={shimmer} className="w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonText shimmer={shimmer} className="w-24" />
          <SkeletonText shimmer={shimmer} className="w-32" />
        </div>
      </div>
      <SkeletonText shimmer={shimmer} className="w-full" />
    </div>
  );
}
