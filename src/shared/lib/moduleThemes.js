/**
 * Sergeant Design System — Module Theme Constants
 *
 * Centralized theme tokens for each app module.
 * Ensures visual consistency across the entire application.
 */

// ═══════════════════════════════════════════════════════════════════════════
// FINYK — Financial Tracker (Emerald/Teal)
// ═══════════════════════════════════════════════════════════════════════════
export const FINYK_THEME = {
  // Text
  eyebrow: "text-finyk",
  heading: "text-text",
  kicker: "text-finyk/90",

  // Icon boxes
  iconBox:
    "bg-finyk-soft dark:bg-finyk/12 border-brand-100 dark:border-finyk/30 text-finyk",

  // Cards
  heroCard: "finyk-hero-card",
  statCard:
    "rounded-2xl bg-panel/80 border border-brand-100/60 dark:border-brand-800/30 p-3 text-center shadow-card backdrop-blur-sm",

  // Buttons
  primary:
    "bg-finyk hover:bg-finyk-hover text-white border-0 shadow-sm transition-all duration-200 active:scale-[0.98]",
  primarySoft:
    "bg-finyk-soft hover:bg-brand-100 text-finyk border border-finyk-ring/50 transition-all duration-200",

  // Navigation
  navActive: "text-finyk dark:text-finyk",
  navBar: "bg-finyk",

  // Chips
  chipOn:
    "border-finyk-ring dark:border-finyk/40 bg-finyk-soft dark:bg-finyk/15 text-finyk shadow-sm",
  chipOff:
    "border-line/60 bg-panel text-muted hover:text-text hover:bg-panelHi transition-colors",

  // Progress
  progressTrack: "text-brand-100 dark:text-brand-900/30",
  progressFill: "text-finyk",

  // Gradient
  heroGradient: "bg-hero-emerald",
};

// ═══════════════════════════════════════════════════════════════════════════
// FIZRUK — Fitness Tracker (Teal)
// ═══════════════════════════════════════════════════════════════════════════
export const FIZRUK_THEME = {
  // Text
  eyebrow: "text-fizruk",
  heading: "text-text",
  kicker: "text-fizruk/90",

  // Icon boxes
  iconBox:
    "bg-fizruk-soft dark:bg-fizruk/12 border-teal-100 dark:border-fizruk/30 text-fizruk",

  // Cards
  heroCard: "fizruk-hero-card",
  statCard:
    "rounded-2xl bg-panel/80 border border-teal-100/60 dark:border-teal-800/30 p-3 text-center shadow-card backdrop-blur-sm",

  // Buttons
  primary:
    "bg-fizruk hover:bg-fizruk-hover text-white border-0 shadow-sm transition-all duration-200 active:scale-[0.98]",
  primarySoft:
    "bg-fizruk-soft hover:bg-teal-100 text-fizruk border border-fizruk-ring/50 transition-all duration-200",
  cta: "fizruk-cta-accent",

  // Navigation
  navActive: "text-fizruk dark:text-fizruk",
  navBar: "bg-fizruk",

  // Chips
  chipOn:
    "border-fizruk-ring dark:border-fizruk/40 bg-fizruk-soft dark:bg-fizruk/15 text-fizruk shadow-sm",
  chipOff:
    "border-line/60 bg-panel text-muted hover:text-text hover:bg-panelHi transition-colors",

  // Progress
  progressTrack: "text-teal-100 dark:text-teal-900/30",
  progressFill: "text-fizruk",

  // Gradient
  heroGradient: "bg-hero-teal",
};

// ═══════════════════════════════════════════════════════════════════════════
// ROUTINE — Habit Tracker (Coral)
// ═══════════════════════════════════════════════════════════════════════════
export const ROUTINE_THEME = {
  // Text
  eyebrow: "text-routine",
  heading: "text-text",
  kicker: "text-routine/90",

  // Icon boxes
  iconBox:
    "bg-routine-surface dark:bg-routine/12 border-coral-100 dark:border-routine/30 text-routine",

  // Cards
  heroCard: "routine-hero-card",
  statCard:
    "rounded-2xl bg-panel/80 border border-coral-100/60 dark:border-coral-800/30 p-3 text-center shadow-card backdrop-blur-sm",

  // Buttons
  primary:
    "bg-routine hover:bg-routine-hover text-white border-0 shadow-sm transition-all duration-200 active:scale-[0.98]",
  primarySoft:
    "bg-routine-surface hover:bg-coral-100 text-routine border border-routine-ring/50 transition-all duration-200",

  // Navigation
  navActive: "text-routine dark:text-routine",
  navBar: "bg-routine",

  // Chips
  chipOn:
    "border-routine-ring dark:border-routine/40 bg-routine-surface dark:bg-routine/15 text-routine shadow-sm",
  chipOff:
    "border-line/60 bg-panel text-muted hover:text-text hover:bg-panelHi transition-colors",

  // Completion states
  done: "border-routine/45 bg-routine-surface dark:bg-routine/12 text-routine",
  doneCheck: "text-routine",

  // Progress
  progressTrack: "text-coral-100 dark:text-coral-900/30",
  progressFill: "text-routine",

  // Gradient
  heroGradient: "bg-hero-coral",
};

// ═══════════════════════════════════════════════════════════════════════════
// NUTRITION — Food Tracker (Lime)
// ═══════════════════════════════════════════════════════════════════════════
export const NUTRITION_THEME = {
  // Text
  eyebrow: "text-nutrition",
  heading: "text-text",
  kicker: "text-nutrition/90",

  // Icon boxes
  iconBox:
    "bg-nutrition-soft dark:bg-nutrition/12 border-lime-100 dark:border-nutrition/30 text-nutrition",

  // Cards
  heroCard: "nutrition-hero-card",
  statCard:
    "rounded-2xl bg-panel/80 border border-lime-100/60 dark:border-lime-800/30 p-3 text-center shadow-card backdrop-blur-sm",

  // Buttons
  primary:
    "bg-nutrition hover:bg-nutrition-hover text-white border-0 shadow-sm transition-all duration-200 active:scale-[0.98]",
  primarySoft:
    "bg-nutrition-soft hover:bg-lime-100 text-nutrition border border-nutrition-ring/50 transition-all duration-200",

  // Navigation
  navActive: "text-nutrition dark:text-nutrition",
  navBar: "bg-nutrition",

  // Chips
  chipOn:
    "border-nutrition-ring dark:border-nutrition/40 bg-nutrition-soft dark:bg-nutrition/15 text-nutrition shadow-sm",
  chipOff:
    "border-line/60 bg-panel text-muted hover:text-text hover:bg-panelHi transition-colors",

  // Progress
  progressTrack: "text-lime-100 dark:text-lime-900/30",
  progressFill: "text-nutrition",

  // Macros colors
  calories: "text-nutrition",
  protein: "text-teal-500",
  carbs: "text-amber-500",
  fat: "text-coral-500",

  // Gradient
  heroGradient: "bg-hero-lime",
};

// ═══════════════════════════════════════════════════════════════════════════
// MODULE PICKER
// ═══════════════════════════════════════════════════════════════════════════
export const MODULE_THEMES = {
  finyk: FINYK_THEME,
  fizruk: FIZRUK_THEME,
  routine: ROUTINE_THEME,
  nutrition: NUTRITION_THEME,
};

export function getModuleTheme(moduleName) {
  return MODULE_THEMES[moduleName] || FINYK_THEME;
}
