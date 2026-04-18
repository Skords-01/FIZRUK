import { cn } from "../../lib/cn";

/**
 * Sergeant Design System — ProgressRing Component
 *
 * Duolingo-inspired circular progress indicator with animation support.
 *
 * Sizes: xs (32px), sm (48px), md (64px), lg (96px), xl (128px)
 * Variants: brand, finyk, fizruk, routine, nutrition
 */

const sizes = {
  xs: { size: 32, strokeWidth: 3, fontSize: "text-2xs" },
  sm: { size: 48, strokeWidth: 4, fontSize: "text-xs" },
  md: { size: 64, strokeWidth: 5, fontSize: "text-sm" },
  lg: { size: 96, strokeWidth: 6, fontSize: "text-lg" },
  xl: { size: 128, strokeWidth: 8, fontSize: "text-xl" },
};

const variants = {
  brand: {
    track: "stroke-brand-100",
    fill: "stroke-brand-500",
    text: "text-brand-600",
  },
  finyk: {
    track: "stroke-brand-100",
    fill: "stroke-finyk",
    text: "text-finyk",
  },
  fizruk: {
    track: "stroke-teal-100",
    fill: "stroke-fizruk",
    text: "text-fizruk",
  },
  routine: {
    track: "stroke-coral-100",
    fill: "stroke-routine",
    text: "text-routine",
  },
  nutrition: {
    track: "stroke-lime-100",
    fill: "stroke-nutrition",
    text: "text-nutrition",
  },
  // Status variants
  success: {
    track: "stroke-brand-100",
    fill: "stroke-success",
    text: "text-success",
  },
  warning: {
    track: "stroke-amber-100",
    fill: "stroke-warning",
    text: "text-warning",
  },
  danger: {
    track: "stroke-red-100",
    fill: "stroke-danger",
    text: "text-danger",
  },
};

export function ProgressRing({
  value = 0,
  max = 100,
  size: sizeProp = "md",
  variant = "brand",
  showValue = true,
  valueFormat,
  label,
  animate = true,
  className,
  children,
}) {
  const config = sizes[sizeProp];
  const colors = variants[variant];

  const { size, strokeWidth } = config;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;

  const displayValue = valueFormat
    ? valueFormat(value, max)
    : `${Math.round(percentage)}%`;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="progress-ring"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn(colors.track, "opacity-50")}
        />
        {/* Progress fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animate ? offset : circumference}
          className={cn(
            colors.fill,
            "progress-ring-circle",
            animate && "transition-[stroke-dashoffset] duration-700 ease-out"
          )}
          style={{
            "--progress-offset": offset,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : (
          <>
            {showValue && (
              <span
                className={cn(
                  "font-bold tabular-nums",
                  config.fontSize,
                  colors.text
                )}
              >
                {displayValue}
              </span>
            )}
            {label && (
              <span className="text-2xs text-muted mt-0.5">{label}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * MultiProgressRing — Multiple concentric progress rings
 * Useful for showing multiple metrics in one visualization
 */
export function MultiProgressRing({
  rings = [],
  size: sizeProp = "lg",
  className,
  children,
}) {
  const baseConfig = sizes[sizeProp];
  const { size } = baseConfig;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="progress-ring"
        aria-hidden="true"
      >
        {rings.map((ring, index) => {
          const strokeWidth = baseConfig.strokeWidth - index * 0.5;
          const gap = (index + 1) * (baseConfig.strokeWidth + 4);
          const radius = (size - strokeWidth) / 2 - gap;
          const circumference = 2 * Math.PI * radius;
          const percentage = Math.min(
            Math.max((ring.value / (ring.max || 100)) * 100, 0),
            100
          );
          const offset = circumference - (percentage / 100) * circumference;
          const colors = variants[ring.variant || "brand"];

          return (
            <g key={index}>
              {/* Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                className={cn(colors.track, "opacity-40")}
              />
              {/* Fill */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={cn(
                  colors.fill,
                  "progress-ring-circle transition-[stroke-dashoffset] duration-700 ease-out"
                )}
              />
            </g>
          );
        })}
      </svg>

      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * ProgressBar — Linear progress indicator
 */
export function ProgressBar({
  value = 0,
  max = 100,
  variant = "brand",
  size = "md",
  showValue = false,
  className,
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const colors = variants[variant];

  const heights = {
    xs: "h-1",
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
    xl: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full rounded-full overflow-hidden",
          colors.track.replace("stroke-", "bg-"),
          "bg-opacity-30",
          heights[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colors.fill.replace("stroke-", "bg-")
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted">{value}</span>
          <span className="text-xs text-subtle">/ {max}</span>
        </div>
      )}
    </div>
  );
}
