# Dark-mode audit

> **Last validated:** 2026-04-29 by @Skords-01.
> **Status:** Closed (Wave 2c shipped, lint guardrail at `error`)
> **Audience:** anyone touching `apps/web` Tailwind class strings.
> **Goal:** catalogue every place that expresses dark mode as an
> explicit `dark:` override on a raw palette color, so we can migrate
> those to single-token semantic utilities (`bg-success-soft`,
> `bg-finyk-surface`, `border-brand-strong`, …) and let the preset own
> the light/dark pair in **one** place.

## TL;DR

- **306** `dark:` overrides across `apps/web/src/**/*.{ts,tsx}` (excluding tests).
- **28** of them were the anti-pattern this audit targets: a _raw
  palette_ background in light mode paired with a hand-tuned _raw
  palette_ (or ad-hoc `-soft`/`/15`) dark variant —
  `bg-teal-100 dark:bg-teal-900/30`, `bg-amber-50 … dark:bg-amber-500/15`,
  `bg-teal-800/10 dark:bg-white/10`, etc.
- **Wave 1b** migrated **21 / 28** of those to the preset-owned
  `{brand,module,status}-soft` family (`bg-brand-soft`,
  `bg-finyk-soft`, `bg-warning-soft`, `border-*-soft-border`,
  `hover:bg-*-soft-hover`). The `--c-{brand,module,status}-soft*`
  CSS variables in `apps/web/src/index.css` now carry the light/dark
  swap, so the call-sites need no `dark:` override at all.
- **Wave 2a + 2b** migrated the remaining **7 / 28** via two
  refactor moves: the `WorkoutFinishSheets.tsx` four-row pattern
  collapsed into a `<WorkoutStatTile>` primitive backed by the new
  `--c-fizruk-tile{,-border}` token (light = teal-800 wash,
  dark = white wash), and the `chartTheme.ts` coral heatmap rows
  moved into `bg-routine-heat-l{1,2,3}` CSS classes whose
  `.dark .X` override owns the per-theme colour. **Audit count
  hits 0.**
- **Wave 2c** ships the lint guardrail: a new ESLint rule
  `sergeant-design/no-raw-dark-palette` (Hard rule #13 in
  `AGENTS.md`) fires on
  any className that pairs a raw-palette light utility
  (`bg-amber-50`, `text-coral-100`, `border-teal-200/50`, …) with
  a `dark:` raw-palette override. While migrating the audit's 28
  inventoried sites the rule surfaced **40** additional paired
  call-sites outside the original inventory (icon containers,
  module-strong tinted text, hero-card borders); all 40 were
  migrated to the canonical Wave 1b shape
  (`text-{family}-strong dark:text-{family}`,
  `border-{module}-soft-border/{N}`, `bg-{module}-soft`, …), so
  the rule promotes to `error` against zero violations. The
  guardrail closes the door on this anti-pattern in CI for every
  future change.
- Every remaining anti-pattern is one `dark:` override away from
  silently falling through on the next palette migration — exactly
  the class of bug [#814](https://github.com/Skords-01/Sergeant/pull/814)
  fixed.

## The anti-pattern, concretely

```tsx
// ❌ Two palette values encoded in the call-site, one per theme.
<div className="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />

// ✅ One semantic token; the preset owns the light/dark pair.
<div className="bg-warning-soft text-warning" />
```

The fix is always the same: either the token exists (`bg-warning-soft`,
`bg-brand-soft`, `bg-finyk-surface`, …) and the call-site uses it, or
the token doesn't exist yet and we extend
`packages/design-tokens/tailwind-preset.js` to add it.

## Full inventory (28 sites)

Grouped by target token — i.e. the semantic utility the line should
end up using once migrated.

### → `bg-{module}-surface` (module-tinted hero / list surfaces)

**Target tokens (Wave 1b will add the dark-mode auto-adapt):** today
`bg-{finyk,fizruk,routine,nutrition}-surface` resolves to a fixed
light color (`moduleColors.{module}.surface`) and its dark-mode
counterpart lives in a separate `{module}-surface-dark` token that
callers must pair with an explicit `dark:` variant. Wave 1b will
either (a) back each `{module}-surface` utility with a CSS variable
that flips per-theme (`--c-{module}-surface-light` / `-dark`), or
(b) ship a single `{module}-surface-soft` alias that already bundles
the `dark:` override — tracked in
[`docs/planning/dev-stack-roadmap.md`](../planning/dev-stack-roadmap.md).
The rows below are hand-rolling the light/dark pair at the call-site
— they become one-token lines after the preset change.

| File                                                   | Line | Current                                                                                                 | Target                                         |
| ------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `apps/web/src/core/insights/WeeklyDigestCard.tsx`      | 25   | `bg-brand-100 dark:bg-brand-900/30`                                                                     | `bg-finyk-surface`                             |
| `apps/web/src/core/insights/WeeklyDigestCard.tsx`      | 32   | `bg-teal-100 dark:bg-teal-900/30`                                                                       | `bg-fizruk-surface`                            |
| `apps/web/src/core/insights/WeeklyDigestCard.tsx`      | 39   | `bg-lime-100 dark:bg-lime-900/30`                                                                       | `bg-nutrition-surface`                         |
| `apps/web/src/core/insights/WeeklyDigestCard.tsx`      | 46   | `bg-coral-100 dark:bg-coral-900/30`                                                                     | `bg-routine-surface`                           |
| `apps/web/src/modules/routine/lib/routineConstants.ts` | 21   | `border-coral-100/60 dark:border-routine-border-dark/25 bg-coral-50/50 dark:bg-routine-surface-dark/8`  | `border-routine-border bg-routine-surface`     |
| `apps/web/src/modules/routine/lib/routineConstants.ts` | 30   | `border-l-routine bg-coral-50/50 dark:bg-routine-surface-dark/10`                                       | `border-l-routine bg-routine-surface`          |
| `apps/web/src/shared/components/ui/Card.tsx`           | 83   | `border border-brand-100 bg-brand-50/50 backdrop-blur-sm dark:border-brand-500/20 dark:bg-brand-500/10` | `border-finyk-border bg-finyk-surface`         |
| `apps/web/src/shared/components/ui/Card.tsx`           | 85   | `border border-teal-100 bg-teal-50/50 backdrop-blur-sm dark:border-teal-500/20 dark:bg-teal-500/10`     | `border-fizruk-border bg-fizruk-surface`       |
| `apps/web/src/shared/components/ui/Card.tsx`           | 87   | `border border-coral-100 bg-coral-50/50 backdrop-blur-sm dark:border-coral-500/20 dark:bg-coral-500/10` | `border-routine-border bg-routine-surface`     |
| `apps/web/src/shared/components/ui/Card.tsx`           | 89   | `border border-lime-100 bg-lime-50/50 backdrop-blur-sm dark:border-lime-500/20 dark:bg-lime-500/10`     | `border-nutrition-border bg-nutrition-surface` |

### → `bg-brand-soft` (brand accent background)

**Target token (Wave 1b will add it):** `bg-brand-soft` (light 8 % /
dark 15 % wash) is **not yet in the preset** — today the call-sites
below hand-roll `bg-brand-50 dark:bg-brand-500/15`. Wave 1b will add
`--c-brand-soft`, `--c-brand-soft-border`, `--c-brand-soft-hover` to
`apps/web/src/index.css` and register matching Tailwind utilities in
`packages/design-tokens/tailwind-preset.js` so `Segmented`, `Tabs`,
`Button`, `Badge` variants can all reuse them.

| File                                                 | Line | Current                                                                                                                                        | Target                                                                               |
| ---------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `apps/web/src/core/insights/AssistantAdviceCard.tsx` | 66   | `bg-brand-50 dark:bg-brand-500/15`                                                                                                             | `bg-brand-soft`                                                                      |
| `apps/web/src/shared/components/ui/Badge.tsx`        | 54   | `bg-brand-50 text-brand-700 border-brand-200/60 dark:bg-brand/15 dark:text-brand dark:border-brand/30`                                         | `bg-brand-soft text-brand-strong border-brand-soft-border`                           |
| `apps/web/src/shared/components/ui/Badge.tsx`        | 56   | (same as :54, duplicate success variant)                                                                                                       | `bg-brand-soft text-brand-strong border-brand-soft-border`                           |
| `apps/web/src/shared/components/ui/Segmented.tsx`    | 71   | `border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand/40 dark:bg-brand/15 dark:text-brand`                                  | `border-brand-soft-border bg-brand-soft text-brand-strong`                           |
| `apps/web/src/shared/components/ui/Tabs.tsx`         | 98   | `bg-brand-50 text-brand-700 dark:bg-brand/15 dark:text-brand`                                                                                  | `bg-brand-soft text-brand-strong`                                                    |
| `apps/web/src/shared/components/ui/Button.tsx`       | 57   | `bg-brand-50 text-brand-700 border border-brand-200/50 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30 …` | `bg-brand-soft text-brand-strong border-brand-soft-border hover:bg-brand-soft-hover` |

### → `bg-{status}-soft` (status/notice surfaces)

Existing tokens: `bg-success-soft`, `bg-warning-soft`, `bg-danger-soft`,
`bg-info-soft` already adapt per theme — documented in
`docs/design/design-system.md` § 2.4.

| File                                           | Line | Current                                                                                                                        | Target                                                           |
| ---------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `apps/web/src/shared/components/ui/Badge.tsx`  | 58   | `bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30`             | `bg-warning-soft text-warning-strong border-warning-soft-border` |
| `apps/web/src/shared/components/ui/Badge.tsx`  | 61   | `bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-info/15 dark:text-blue-300 dark:border-info/30`                           | `bg-info-soft text-info-strong border-info-soft-border`          |
| `apps/web/src/shared/components/ui/Banner.tsx` | 16   | `border-emerald-200/70 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100` | `bg-success-soft text-success-strong border-success-soft-border` |
| `apps/web/src/shared/components/ui/Banner.tsx` | 18   | `border-amber-200/70 bg-amber-50 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100`             | `bg-warning-soft text-warning-strong border-warning-soft-border` |
| `apps/web/src/shared/components/ui/Banner.tsx` | 20   | `border-red-200/70 bg-red-50 text-red-800 dark:border-danger/30 dark:bg-danger/10 dark:text-red-100`                           | `bg-danger-soft text-danger-strong border-danger-soft-border`    |

### → new `WorkoutStatTile` primitive (WorkoutFinishSheets)

These four rows are a repeated "Fizruk workout-complete stat tile"
pattern — same className soup with `bg-teal-800/10 dark:bg-white/10 …`.
They shouldn't be fixed by a `dark:` swap — they should be extracted
into a reusable `<WorkoutStatTile>` primitive in
`apps/web/src/modules/fizruk/components/workouts/`. The primitive gets
one semantic token (new `bg-fizruk-tile` or reuse `bg-fizruk-surface`)
and the four call-sites collapse to `<WorkoutStatTile … />`.

| File                                                                      | Line | Current                                                                                                      |
| ------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/modules/fizruk/components/workouts/WorkoutFinishSheets.tsx` | 174  | `bg-teal-800/10 dark:bg-white/10 text-teal-700 dark:text-white/70 hover:text-teal-900 dark:hover:text-white` |
| `apps/web/src/modules/fizruk/components/workouts/WorkoutFinishSheets.tsx` | 182  | `bg-teal-800/10 dark:bg-white/10 border border-teal-800/15 dark:border-white/15`                             |
| `apps/web/src/modules/fizruk/components/workouts/WorkoutFinishSheets.tsx` | 193  | (same)                                                                                                       |
| `apps/web/src/modules/fizruk/components/workouts/WorkoutFinishSheets.tsx` | 203  | (same)                                                                                                       |

### → chart-palette refactor (chartTheme)

Chart series colors are a special case — the palette is _intentionally_
expressed as a series of (light, dark) pairs so Recharts can render
against either theme. The fix is not a token swap; it's to move the
pairs into `chartGradients` (CSS variables per-theme) so the JS layer
stops owning them.

| File                                       | Line | Current                                |
| ------------------------------------------ | ---- | -------------------------------------- |
| `apps/web/src/shared/charts/chartTheme.ts` | 110  | `bg-coral-200/80 dark:bg-coral-900/55` |
| `apps/web/src/shared/charts/chartTheme.ts` | 111  | `bg-coral-400/75 dark:bg-coral-600/70` |
| `apps/web/src/shared/charts/chartTheme.ts` | 112  | `bg-coral-500/90 dark:bg-coral-500/80` |

## What happens next

1. **Wave 1b — DONE.** The preset now ships the `-soft` /
   `-soft-border` / `-soft-hover` trio for `brand` and all four
   modules (`finyk`, `fizruk`, `routine`, `nutrition`) — backed by
   `--c-{family}-soft*` CSS variables in
   `apps/web/src/index.css` that flip between light and dark themes
   automatically. 21 / 28 call-sites migrated; each drops ≥ 1
   `dark:` override, net reduction ≈ 40 `dark:` occurrences.
2. **Wave 2a — DONE.** The four `WorkoutFinishSheets.tsx` rows now
   resolve through a `<WorkoutStatTile>` primitive in
   `apps/web/src/modules/fizruk/components/workouts/WorkoutStatTile.tsx`,
   backed by the new `--c-fizruk-tile{,-border}` CSS variables (light =
   teal-800 wash, dark = white wash). The summary-sheet close button
   reuses the same token (`bg-fizruk-tile/10`) so its raw-palette
   `dark:bg-white/10` override is also gone.
3. **Wave 2b — DONE.** The three `chartTheme.ts` heatmap rows now
   resolve through `bg-routine-heat-l{1,2,3}` CSS classes defined in
   `apps/web/src/styles/module-surfaces.css`. The `.dark .X` override
   owns the per-theme RGB+opacity pair; the JS module references one
   class name per level. Audit count = 0.
4. **Wave 2c — DONE.** The new ESLint rule
   `sergeant-design/no-raw-dark-palette` ships at **`error`**
   level (Hard rule #13 in `AGENTS.md`). Scope: pair-only —
   the rule fires on a className that pairs both a raw-palette
   light utility (`<utility>-<palette>-<step>`,
   `<utility>` ∈ {`bg`, `text`, `border`}, `<palette>` ∈ the
   24-name list above) **and** a `dark:` raw-palette override on
   the same className. Dark-side-only "patches" (light is already
   semantic, dark patches a missing `-strong` step) intentionally
   stay; same for the `dark:bg-white/N` glass washes. The rule is
   tested in
   `packages/eslint-plugin-sergeant-design/__tests__/no-raw-dark-palette.test.mjs`
   (20 cases) and exempted on the plugin's own files
   (`packages/eslint-plugin-sergeant-design/**/*.{js,mjs}`) so
   in-source examples in rule documentation do not self-flag.
   **Scope: `apps/web/**/_.{ts,tsx,js,jsx}` only.** The semantic
replacements (`bg-{family}-soft`, `border-{module}-soft-border`,
`text-{family}-strong`) resolve through the
`--c-{family}-soft_`/`--c-{family}-strong*`CSS variables
defined in`apps/web/src/index.css`. NativeWind (`apps/mobile`)
compiles classNames into React Native inline styles and does
not consume those CSS variables — running the rule there would
force authors toward tokens that resolve to `rgb(undefined)`on mobile, so the rule is registered scoped to`apps/web/\*\*/*.{ts,tsx,js,jsx}` only.

## Legitimate `dark:` uses that STAY

Not every `dark:` is an anti-pattern. These patterns are fine and the
`sergeant-design/no-raw-dark-palette` rule does NOT flag them:

- `dark:bg-surface`, `dark:bg-surface-muted`, `dark:text-fg`,
  `dark:border-border` — these are semantic tokens that happen to
  carry the `dark:` prefix because of a specific override
  (e.g. stacked modal surfaces).
- `dark:bg-white/5`, `dark:bg-white/10`, `dark:border-white/15` — the
  "barely-there glass wash on a dark surface" pattern documented in
  `docs/design/design-system.md` § 2.1; these are semantically
  "increase contrast on dark" and are correct.
- Variant overrides on interactive states:
  `hover:bg-surface-muted dark:hover:bg-surface-muted` — sometimes
  written explicitly to opt out of a `hover:` fallthrough.

The shipped rule (`sergeant-design/no-raw-dark-palette`) targets the
specific raw-palette light/dark **pair** (both halves required on the
same className): `<utility>-<PALETTE_COLOR>-<SHADE>` paired with
`dark:<utility>-<PALETTE_COLOR>-<SHADE>` where
`<utility> ∈ { bg, text, border }` and `<PALETTE_COLOR> ∈ {gray, slate,
zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald,
teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose,
brand, coral}` — **not** the semantic tokens (`brand-soft`,
`brand-strong`, `routine-soft-border`, …) and **not** the bare-colour
washes (`dark:bg-white/10`, `dark:bg-black/40`).
