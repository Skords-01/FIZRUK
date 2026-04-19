/**
 * Sergeant Design System — Chart Theme
 *
 * Canonical colour, axis, tick and tooltip tokens for all data-viz in the
 * app (ФІНІК trends, ФІЗРУК progress, Рутина heatmap, Харчування macros).
 *
 * The source-of-truth palette lives in
 * `src/modules/finyk/constants/chartPalette.js` so existing JS imports
 * keep working. This file re-exports the palette and adds shared
 * render-side primitives (Tailwind classNames + SVG attrs) so charts
 * across modules share axes, grid lines, ticks and tooltips.
 *
 * Usage:
 *
 *   import { chartAxis, chartGrid, chartTick, chartTooltip, chartSeries }
 *     from "@shared/charts/chartTheme";
 *
 *   <text {...chartTick} x={..} y={..}>{label}</text>
 *   <line {...chartGrid.horizontal} x1={..} x2={..} />
 *   <path stroke={chartSeries.finyk.primary} ... />
 */

import {
  brandColors,
  chartPalette,
  chartPaletteList,
  moduleColors,
  statusColors,
} from "../../modules/finyk/constants/chartPalette.js";

export {
  brandColors,
  chartPalette,
  chartPaletteList,
  moduleColors,
  statusColors,
};

/** Per-module accent tokens — prefer this over hardcoded hex in charts. */
export const chartSeries = {
  finyk: {
    primary: moduleColors.finyk.primary,
    secondary: moduleColors.finyk.secondary,
    surface: moduleColors.finyk.surface,
  },
  fizruk: {
    primary: moduleColors.fizruk.primary,
    secondary: moduleColors.fizruk.secondary,
    surface: moduleColors.fizruk.surface,
  },
  routine: {
    primary: moduleColors.routine.primary,
    secondary: moduleColors.routine.secondary,
    surface: moduleColors.routine.surface,
  },
  nutrition: {
    primary: moduleColors.nutrition.primary,
    secondary: moduleColors.nutrition.secondary,
    surface: moduleColors.nutrition.surface,
  },
} as const;

/** Axis line & label defaults — apply via spread on `<text>` / `<line>`. */
export const chartAxis = {
  /** Primary axis line (x/y baseline). */
  line: {
    className: "stroke-line/60",
    strokeWidth: 1,
  },
  /** Axis label (e.g. "₴ за місяць"). */
  label: {
    className: "fill-muted text-[11px] font-medium tabular-nums",
  },
} as const;

/** Grid lines drawn across the plot area. */
export const chartGrid = {
  horizontal: {
    className: "stroke-line/40",
    strokeDasharray: "3 3",
    strokeWidth: 1,
  },
  vertical: {
    className: "stroke-line/30",
    strokeDasharray: "2 4",
    strokeWidth: 1,
  },
} as const;

/** Tick label styling (numbers beside axes). */
export const chartTick = {
  className: "fill-muted text-[10px] tabular-nums",
  textAnchor: "middle" as const,
} as const;

/**
 * Tooltip style tokens — Tailwind classes to apply to a floating
 * `<div role="tooltip">` above an interactive chart element.
 */
export const chartTooltip = {
  container:
    "rounded-xl border border-line bg-panel shadow-float px-3 py-2 text-xs text-text",
  label: "text-[10px] font-semibold text-subtle uppercase tracking-wider",
  value: "text-sm font-semibold text-text tabular-nums",
  delta: {
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-muted",
  },
} as const;

/**
 * Gradient stops used by area/fill series, keyed by module. Consumers can
 * embed these as `<linearGradient>` stops without re-picking hex codes.
 */
export const chartGradients = {
  finyk: [
    { offset: "0%", stopColor: chartSeries.finyk.primary, stopOpacity: 0.35 },
    { offset: "100%", stopColor: chartSeries.finyk.primary, stopOpacity: 0 },
  ],
  fizruk: [
    { offset: "0%", stopColor: chartSeries.fizruk.primary, stopOpacity: 0.35 },
    { offset: "100%", stopColor: chartSeries.fizruk.primary, stopOpacity: 0 },
  ],
  routine: [
    { offset: "0%", stopColor: chartSeries.routine.primary, stopOpacity: 0.4 },
    { offset: "100%", stopColor: chartSeries.routine.primary, stopOpacity: 0 },
  ],
  nutrition: [
    {
      offset: "0%",
      stopColor: chartSeries.nutrition.primary,
      stopOpacity: 0.4,
    },
    {
      offset: "100%",
      stopColor: chartSeries.nutrition.primary,
      stopOpacity: 0,
    },
  ],
} as const;

export type ChartModule = keyof typeof chartSeries;
