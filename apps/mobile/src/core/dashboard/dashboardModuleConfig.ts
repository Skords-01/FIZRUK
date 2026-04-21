/**
 * Hub dashboard — per-module rendering config (icons, routes, colour
 * accents). The source of truth for ids and labels lives in
 * `@sergeant/shared/dashboard`; this file adds the mobile-only
 * view-model (emoji glyph, accent classes, deep-link route).
 *
 * We intentionally keep this co-located with the dashboard instead of
 * pulling from the web `MODULE_CONFIGS` object — the web copy bakes
 * localStorage reads for quick-stats previews into each entry, which
 * would drag a whole rendering pathway into a pure config file. The
 * mobile StatusRow renders labels + icons only for now; preview stats
 * land in a follow-up PR (Phase 3 / quick-stats writers).
 */

import type { DashboardModuleId } from "@sergeant/shared";

/**
 * Valid Expo Router hrefs for each module's root tab. Literal strings
 * (not `as const` on the whole object) so expo-router's typed-href
 * inference picks them up correctly when passed to `router.push`.
 */
export const DASHBOARD_MODULE_ROUTES: Record<DashboardModuleId, string> = {
  finyk: "/(tabs)/finyk",
  fizruk: "/(tabs)/fizruk",
  routine: "/(tabs)/routine",
  nutrition: "/(tabs)/nutrition",
};

export interface DashboardModuleRenderConfig {
  /** User-facing short label rendered inside the row. */
  readonly label: string;
  /**
   * Single-character glyph used as the row's leading icon. Keeping a
   * text glyph (not an SVG) sidesteps the need for a vector-icon
   * dependency in this first cut and matches the mobile tab bar,
   * which also emoji-ifies module icons.
   */
  readonly glyph: string;
  /** Tailwind class applied to the leading icon wrapper. */
  readonly iconBgClass: string;
  /** Tailwind class applied to the narrow accent bar on the left edge. */
  readonly accentClass: string;
  /** One-liner description rendered under the label. */
  readonly description: string;
}

/**
 * Presentation config per module. Kept minimal so the row component
 * stays trivially testable — anything dynamic (preview stats, signal
 * dots) flows through props.
 */
export const DASHBOARD_MODULE_RENDER: Record<
  DashboardModuleId,
  DashboardModuleRenderConfig
> = {
  finyk: {
    label: "Фінік",
    glyph: "💰",
    iconBgClass: "bg-brand-100",
    accentClass: "bg-finyk",
    description: "Транзакції та бюджети",
  },
  fizruk: {
    label: "Фізрук",
    glyph: "🏋",
    iconBgClass: "bg-teal-100",
    accentClass: "bg-fizruk",
    description: "Тренування та прогрес",
  },
  routine: {
    label: "Рутина",
    glyph: "✅",
    iconBgClass: "bg-coral-100",
    accentClass: "bg-routine",
    description: "Звички та щоденні цілі",
  },
  nutrition: {
    label: "Харчування",
    glyph: "🍽",
    iconBgClass: "bg-lime-100",
    accentClass: "bg-nutrition",
    description: "КБЖВ та раціон",
  },
};

/**
 * Modules rendered on the mobile dashboard in this phase. Nutrition
 * is deliberately hidden until Phase 7 (see
 * `docs/react-native-migration.md`). The persisted order still holds
 * all four ids so a web client opening the same account sees the
 * full list — see `reorderWithHidden` in `@sergeant/shared`.
 */
export const VISIBLE_DASHBOARD_MODULES: readonly DashboardModuleId[] = [
  "finyk",
  "fizruk",
  "routine",
];
