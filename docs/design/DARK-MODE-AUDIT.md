# Dark-mode audit

> **Last validated:** 2026-04-29 by @Skords-01.
> **Audience:** anyone touching `apps/web` Tailwind class strings.
> **Goal:** catalogue every place that expresses dark mode as an
> explicit `dark:` override on a raw palette color, so we can migrate
> those to single-token semantic utilities (`bg-success-soft`,
> `bg-finyk-surface`, `border-brand-strong`, …) and let the preset own
> the light/dark pair in **one** place.

## TL;DR

- **306** `dark:` overrides across `apps/web/src/**/*.{ts,tsx}` (excluding tests).
- **28** of them are the anti-pattern this audit targets: a _raw
  palette_ background in light mode paired with a hand-tuned _raw
  palette_ (or ad-hoc `-soft`/`/15`) dark variant —
  `bg-teal-100 dark:bg-teal-900/30`, `bg-amber-50 … dark:bg-amber-500/15`,
  `bg-teal-800/10 dark:bg-white/10`, etc.
- Every anti-pattern is one `dark:` override away from silently falling
  through on the next palette migration — exactly the class of bug
  [#814](https://github.com/Skords-01/Sergeant/pull/814) fixed.

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

Existing token: `bg-{finyk,fizruk,routine,nutrition}-surface` already
adapts per theme via the preset. Each of these rows is hand-rolling
an ad-hoc equivalent.

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

Existing token: `bg-brand-soft` (light 8 % / dark 15 % wash) ships in
the preset and is what `Segmented`, `Tabs`, `Button`, `Badge` variants
should all reuse.

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

1. **Wave 1b** (this PR family, next up): extend the preset with the
   tokens that are _referenced_ in the "Target" columns above but not
   yet in the preset — `bg-brand-soft-border`,
   `bg-warning-soft-border`, `bg-info-soft-border`,
   `bg-success-soft-border`, `bg-danger-soft-border`,
   `bg-finyk-border`, `bg-fizruk-border`, `bg-routine-border`,
   `bg-nutrition-border`. Verify each clears WCAG AA against
   body copy.
2. **Wave 1c**: migrate the 28 call-sites above to the semantic tokens
   in small, reviewable batches (one file per commit). Each commit
   removes a pair of `dark:` overrides — net reduction
   `~2 × 28 = 56` `dark:` occurrences (~18 %).
3. **Wave 2+**: the `WorkoutFinishSheets` four-row pattern becomes a
   real `<WorkoutStatTile>` primitive; the `chartTheme` coral pairs
   move into CSS variables. After those two moves land, expect to be
   under `250` total `dark:` occurrences in `apps/web`.
4. **Final step**: promote a lint rule in
   `packages/eslint-plugin-sergeant-design` that forbids any
   `dark:bg-<palette>-<N>` / `dark:text-<palette>-<N>` pattern — the
   anti-pattern is now zero, so the rule promotes to `error` without
   breaking anything.

## Legitimate `dark:` uses that STAY

Not every `dark:` is an anti-pattern. These patterns are fine and the
future lint rule must NOT flag them:

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

The rule we eventually ship will target the specific raw-palette
pair: `dark:(bg|text|border)-<PALETTE_COLOR>-<SHADE>` where
`PALETTE_COLOR ∈ {gray, slate, zinc, neutral, stone, red, orange,
amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo,
violet, purple, fuchsia, pink, rose, brand, coral}` — **not** the
semantic tokens.
