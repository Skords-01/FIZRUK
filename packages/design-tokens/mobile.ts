/**
 * Mobile spacing / radius / color constants for `apps/mobile`.
 *
 * Single source of truth for the React Native theme — re-exported by
 * `apps/mobile/src/theme.ts`. Keeps mobile-specific scalar tokens in the
 * shared design-tokens package so future cross-app work (e.g. a Capacitor
 * shell variant) can consume the same values.
 */

export const colors = {
  bg: "#0b0d10",
  surface: "#13161b",
  border: "#1f242c",
  text: "#f2f4f7",
  textMuted: "#8a94a6",
  accent: "#7c5cff",
  danger: "#ef4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const;

export type MobileColor = keyof typeof colors;
export type MobileSpacing = keyof typeof spacing;
export type MobileRadius = keyof typeof radius;
