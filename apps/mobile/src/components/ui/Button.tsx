/**
 * Sergeant Design System — Button (React Native)
 *
 * Mobile port of the web Button primitive. Public API is intentionally
 * kept as close to the web component as possible so screens can share
 * prop shapes.
 *
 * @see apps/web/src/shared/components/ui/Button.tsx — canonical source of truth
 *
 * Parity notes:
 * - Same variant enum (primary/secondary/ghost/danger/destructive/success
 *   plus module-specific `finyk`/`fizruk`/`routine`/`nutrition` and their
 *   `-soft` variants).
 * - Same size enum (xs / sm / md / lg / xl) and `iconOnly` flag.
 *   With `iconOnly`, pass `accessibilityLabel` (Web Interface Guidelines /
 *   parity with web `aria-label` on icon-only controls).
 * - `loading` swaps the label for an `ActivityIndicator` while preserving
 *   button width (label is still laid out invisibly underneath).
 * - Icons are supplied via `children` (matches web). Caller is responsible
 *   for providing the right platform icon component.
 *
 * Differences from web (intentional — see PR body):
 * - Hover / focus-ring classes are omitted (no hover on mobile; RN focus
 *   rings are platform-managed).
 * - `type` / other HTML button attributes are dropped; props extend
 *   `PressableProps` instead of `ButtonHTMLAttributes`.
 */

import { forwardRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Text,
  View,
  type View as RNView,
} from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "destructive"
  | "success"
  | "finyk"
  | "fizruk"
  | "routine"
  | "nutrition"
  | "finyk-soft"
  | "fizruk-soft"
  | "routine-soft"
  | "nutrition-soft";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

// Variant → container (background / border) NativeWind classes.
// Mirrors the web file; hover: / active:scale utilities are dropped since
// RN has no hover state and scale feedback is handled via `pressed` below.
const variantContainer: Record<ButtonVariant, string> = {
  // Core variants
  primary: "bg-brand-strong",
  secondary: "bg-panel border border-line",
  ghost: "bg-transparent",
  danger: "bg-danger/10 border border-danger/30",
  destructive: "bg-danger",
  success: "bg-brand-50 border border-brand-200/50",

  // Module-specific
  finyk: "bg-finyk-strong",
  fizruk: "bg-fizruk-strong",
  routine: "bg-routine-strong",
  nutrition: "bg-nutrition-strong",

  // Soft module variants
  "finyk-soft": "bg-brand-50 border border-brand-200/50",
  "fizruk-soft": "bg-teal-50 border border-teal-200/50",
  "routine-soft": "bg-coral-50 border border-coral-300/50",
  "nutrition-soft": "bg-lime-50 border border-lime-200/50",
};

// Variant → label (text) NativeWind classes.
const variantLabel: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-text",
  ghost: "text-muted",
  danger: "text-danger",
  destructive: "text-white",
  success: "text-brand-700",

  finyk: "text-white",
  fizruk: "text-white",
  routine: "text-white",
  nutrition: "text-white",

  "finyk-soft": "text-brand-700",
  "fizruk-soft": "text-teal-700",
  "routine-soft": "text-coral-700",
  "nutrition-soft": "text-lime-800",
};

// Size presets — all sizes meet 44px minimum touch target (WCAG 2.5.5)
const sizeContainer: Record<ButtonSize, string> = {
  xs: "min-h-[44px] h-10 px-4 rounded-xl",
  sm: "min-h-[44px] h-11 px-4 rounded-xl",
  md: "min-h-[48px] h-12 px-5 rounded-2xl",
  lg: "min-h-[52px] h-14 px-6 rounded-2xl",
  xl: "min-h-[56px] h-16 px-8 rounded-3xl",
};

const sizeLabel: Record<ButtonSize, string> = {
  xs: "text-xs font-medium",
  sm: "text-sm font-medium",
  md: "text-sm font-semibold",
  lg: "text-base font-semibold",
  xl: "text-base font-bold",
};

// Icon-only sizes — all meet 44px minimum touch target
const iconOnlySize: Record<ButtonSize, string> = {
  xs: "h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl",
  sm: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl",
  md: "h-12 w-12 min-h-[48px] min-w-[48px] rounded-2xl",
  lg: "h-14 w-14 min-h-[52px] min-w-[52px] rounded-2xl",
  xl: "h-16 w-16 min-h-[56px] min-w-[56px] rounded-3xl",
};

// `text-color` strings map to the Text `color` prop via NativeWind, so the
// ActivityIndicator (which doesn't inherit color via className) can use
// these hexes directly.
const indicatorColor: Record<ButtonVariant, string> = {
  primary: "#ffffff",
  secondary: "#1c1917",
  ghost: "#78716c",
  danger: "#ef4444",
  destructive: "#ffffff",
  success: "#047857",
  finyk: "#ffffff",
  fizruk: "#ffffff",
  routine: "#ffffff",
  nutrition: "#ffffff",
  "finyk-soft": "#047857",
  "fizruk-soft": "#0f766e",
  "routine-soft": "#c23a3a",
  "nutrition-soft": "#466212",
};

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "style"
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  loading?: boolean;
  className?: string;
  textClassName?: string;
  children?: ReactNode;
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const Button = forwardRef<RNView, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    iconOnly = false,
    loading = false,
    disabled,
    className,
    textClassName,
    children,
    hitSlop = 8,
    accessibilityLabel,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const containerClass = cx(
    "flex-row items-center justify-center",
    iconOnly ? iconOnlySize[size] : sizeContainer[size],
    variantContainer[variant],
    isDisabled && "opacity-50",
    className,
  );

  const labelClass = cx(sizeLabel[size], variantLabel[variant], textClassName);

  const renderChildren = () => {
    if (typeof children === "string" || typeof children === "number") {
      return <Text className={labelClass}>{children}</Text>;
    }
    return children;
  };

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      className={containerClass}
      style={({ pressed }) =>
        pressed && !isDisabled
          ? { transform: [{ scale: 0.97 }], opacity: 0.9 }
          : undefined
      }
      {...props}
    >
      {loading ? (
        <View className="flex-row items-center justify-center">
          <ActivityIndicator
            size="small"
            color={indicatorColor[variant]}
            accessibilityLabel="Завантаження…"
          />
          {!iconOnly && (
            <View style={{ position: "absolute", opacity: 0 }} aria-hidden>
              {renderChildren()}
            </View>
          )}
        </View>
      ) : (
        renderChildren()
      )}
    </Pressable>
  );
});
