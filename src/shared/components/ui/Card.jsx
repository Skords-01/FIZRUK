import { forwardRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Sergeant Design System — Card Component
 *
 * Variants:
 * - default: Standard panel card
 * - interactive: Hover lift effect for clickable cards
 * - flat: No shadow, minimal border
 * - hero: Module-branded hero card with gradient background
 *
 * Padding:
 * - none: No padding
 * - sm: 12px padding
 * - md: 16px padding (default)
 * - lg: 20px padding
 * - xl: 24px padding
 */

const variants = {
  default: "bg-panel border border-line rounded-3xl shadow-card",
  interactive:
    "bg-panel border border-line rounded-3xl shadow-card transition-all duration-200 ease-smooth hover:shadow-float hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer",
  flat: "bg-panel border border-line rounded-3xl",
  elevated: "bg-panel border border-line rounded-3xl shadow-float",
  ghost: "bg-transparent border border-transparent rounded-3xl",

  // Module hero cards
  finyk: "rounded-3xl border border-brand-200/50 bg-hero-emerald shadow-card",
  fizruk: "rounded-3xl border border-teal-200/50 bg-hero-teal shadow-card",
  routine: "rounded-3xl border border-coral-200/50 bg-hero-coral shadow-card",
  nutrition: "rounded-3xl border border-lime-200/50 bg-hero-lime shadow-card",

  // Soft module cards (less prominent)
  "finyk-soft":
    "rounded-2xl border border-brand-100 bg-brand-50/50 backdrop-blur-sm",
  "fizruk-soft":
    "rounded-2xl border border-teal-100 bg-teal-50/50 backdrop-blur-sm",
  "routine-soft":
    "rounded-2xl border border-coral-100 bg-coral-50/50 backdrop-blur-sm",
  "nutrition-soft":
    "rounded-2xl border border-lime-100 bg-lime-50/50 backdrop-blur-sm",
};

const paddings = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  xl: "p-6",
};

export const Card = forwardRef(function Card(
  {
    className,
    variant = "default",
    padding = "md",
    as: Component = "div",
    children,
    ...props
  },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn(variants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </Component>
  );
});

/**
 * CardHeader — Consistent header section for cards
 */
export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardTitle — Title text for cards
 */
export function CardTitle({ className, as: Component = "h3", ...props }) {
  return (
    <Component
      className={cn("text-lg font-semibold text-text", className)}
      {...props}
    />
  );
}

/**
 * CardDescription — Secondary text for cards
 */
export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted mt-1", className)} {...props} />;
}

/**
 * CardContent — Main content area with optional overflow handling
 */
export function CardContent({ className, ...props }) {
  return <div className={cn("", className)} {...props} />;
}

/**
 * CardFooter — Footer section for actions
 */
export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 mt-4 pt-4 border-t border-line",
        className,
      )}
      {...props}
    />
  );
}

/**
 * MetricCard — Specialized card for displaying single metrics
 */
export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  variant = "default",
  className,
  ...props
}) {
  const trendColor =
    trend > 0
      ? "text-brand-600 bg-brand-50"
      : trend < 0
        ? "text-red-600 bg-red-50"
        : "text-muted bg-stone-100";

  return (
    <Card
      variant={variant}
      padding="md"
      className={cn("", className)}
      {...props}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-text tabular-nums">
          {value}
        </span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                trendColor,
              )}
            >
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
          )}
          {trendLabel && (
            <span className="text-xs text-subtle">{trendLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * HeroCard — Large prominent card for module headers
 */
export function HeroCard({
  module,
  title,
  subtitle,
  children,
  className,
  ...props
}) {
  const moduleVariant = module || "default";

  return (
    <Card
      variant={moduleVariant}
      padding="lg"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {title && (
        <div className="mb-4">
          {subtitle && (
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
              {subtitle}
            </p>
          )}
          <h2 className="text-xl font-bold text-text">{title}</h2>
        </div>
      )}
      {children}
    </Card>
  );
}
