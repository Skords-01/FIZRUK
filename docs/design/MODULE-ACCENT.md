# Module accent — canonical reference

> Sergeant — 4 модулі з власним брендовим кольором. Замість того, щоб
> кожен компонент отримував пропс `module="finyk"` / `module="fizruk"`
> й мапив це у `bg-finyk` / `bg-fizruk`, ми публікуємо активний акцент
> як CSS-variable на дереві модуля і маємо одну Tailwind-утиліту, що
> тягне цей колір у будь-яку поверхню всередині модуля.

## TL;DR

```tsx
<ModuleShell module="finyk" ...>
  <div className="bg-module-accent/10 border border-module-accent/30" />
  <button className="bg-module-accent-strong text-white">CTA</button>
</ModuleShell>
```

- `bg-module-accent` → активний module-колір (`finyk`=emerald-500,
  `fizruk`=teal-500, `routine`=coral-500, `nutrition`=lime-500).
- `bg-module-accent-strong` → WCAG-AA `-strong` companion для фонів під
  `text-white` (clears 4.5 : 1).
- Використовується у спільних компонентах, які живуть у 4 модулях —
  без hardcoded `bg-finyk` / `bg-fizruk` лукапів.

## Three layers

```
┌─────────────────────────────────────────────────────────┐
│  packages/design-tokens/tokens.js  (single source)     │
│  └─ moduleAccentRgb = {                                │
│       finyk:     { default: "16 185 129", strong: …}   │
│       fizruk:    { default: "20 184 166", strong: …}   │
│       routine:   { default: "249 112 102", strong: …}  │
│       nutrition: { default: "146 204 23", strong: …}   │
│     }                                                   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  ModuleAccentProvider / ModuleShell                    │
│  └─ writes:                                            │
│       --module-accent-rgb: <default>                   │
│       --module-accent-strong-rgb: <strong>             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Tailwind preset                                        │
│  └─ registers:                                         │
│       module-accent: rgb(var(--module-accent-rgb)/…)   │
│       module-accent-strong: rgb(var(--…-strong-rgb)/…) │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              `bg-module-accent/10`
              `text-module-accent`
              `bg-module-accent-strong text-white`
              `border-module-accent/30`
              … any Tailwind color utility works
```

## Rules

1. **Edit RGB triplets only in `packages/design-tokens/tokens.js`.** They
   must match `moduleColors.{module}.primary` (for `default`) and the
   WCAG-AA companion shade (for `strong` — typically `-700`, except
   nutrition/lime which uses `-800`). Never re-declare these in React
   components.

2. **`bg-module-accent*` works only inside a `ModuleAccentProvider` or
   `ModuleShell` with `module` prop.** Outside, `--module-accent-rgb`
   is undefined and the utility resolves to `rgb( )` — effectively
   transparent. If you're designing a component that might render
   standalone (e.g. Storybook, hub-level page loader), keep the
   explicit `module` prop + `bg-{module}/10` fallback.

3. **Use `-strong` behind `text-white`.** Saturated `-500` shades
   regress to ~2.4–2.8 : 1 against white. See
   [`docs/design/BRANDBOOK.md`](./BRANDBOOK.md) § WCAG-AA `-strong` Tier
   for the per-family contrast table.

4. **Hub chrome stays neutral.** `HubHeader`, `HubTabs`, `HubDashboard`,
   HubChat, dashboards with all 4 modules side-by-side — these must
   keep `bg-brand-*` tokens (neutral Sergeant palette) or mix
   per-module tokens by name. Do NOT use `bg-module-accent*` here;
   there is no ambient module.

## Migration (incremental, no big-bang)

`bg-module-accent*` is **additive**. Existing `bg-finyk` / `bg-fizruk`
/ etc. still work. Migrate one surface at a time when the surface is
already themed by `ModuleAccentProvider`:

```diff
  // Inside FinykApp.tsx, NutritionApp.tsx, etc.
- <div className="rounded-2xl bg-finyk-soft/40 dark:bg-finyk-surface-dark/8" />
+ <div className="rounded-2xl bg-module-accent/8 dark:bg-module-accent/10" />
```

Good migration candidates:

- Shared `Skeleton*` placeholders with `module` prop — drop the prop
  once the skeleton always renders inside `ModuleAccentProvider`.
- `ModulePageLoader` sub-sections (`FinykLoader`, `FizrukLoader`, …) —
  unify into one `ModuleLoader` that reads the ambient accent.
- Tint washes on `Card` / `Sheet` overlays — consistent 8 % / 10 % /
  15 % opacity across modules.

Do NOT migrate:

- `WelcomeScreen.tsx`, `ModuleChecklist.tsx`, `moduleConfigs.tsx`,
  `HubInsightsPanel.tsx` — these show multiple modules side-by-side.
  Each card must carry its own hardcoded module token (`bg-finyk-soft`,
  `bg-fizruk-soft`, …) because there is no ambient accent.
- `Button` module variants (`variant="finyk"` / `module="finyk"`) —
  these explicitly pick a module; the API is clearer that way.
- Anywhere inside `core/**` (hub-level). Hub is module-agnostic.

## Anti-patterns

```tsx
// ❌ BAD — hardcoded RGB triplet in React; will drift from Tailwind
<div style={{ backgroundColor: "rgb(16 185 129 / 0.1)" }} />

// ❌ BAD — lookup table that re-invents what Tailwind already provides
const TINT = {
  finyk: "bg-finyk/10",
  fizruk: "bg-fizruk/10",
  /* ... */
};
<div className={TINT[module]} />

// ❌ BAD — `bg-module-accent/10` outside a `ModuleAccentProvider`
// (renders transparent; debug-hours ahead)
<HubDashboard>
  <div className="bg-module-accent/10" />  {/* ← no ambient accent */}
</HubDashboard>

// ✅ GOOD — ambient accent inside a module surface
<ModuleShell module="routine">
  <Card className="bg-module-accent/8 border-module-accent/20" />
  <Button className="bg-module-accent-strong text-white">Зберегти</Button>
</ModuleShell>
```

## API

### Design tokens (`@sergeant/design-tokens/tokens`)

```ts
export const moduleAccentRgb: Record<
  ModuleAccent,
  {
    default: string; // "R G B" (saturated -500)
    strong: string; // "R G B" (WCAG-AA -700/-800)
  }
>;
```

### React (`@shared/components/layout`)

```ts
// Writes CSS vars + provides useModuleAccent() context.
<ModuleAccentProvider module="finyk">...</ModuleAccentProvider>
<ModuleShell module="finyk" header={…} nav={…}>...</ModuleShell>

// Active accent ("finyk" | "fizruk" | "routine" | "nutrition" | null).
const accent = useModuleAccent();
```

### Tailwind

```
bg-module-accent           bg-module-accent-strong
bg-module-accent/10        bg-module-accent-strong/90
text-module-accent         text-module-accent-strong
border-module-accent       border-module-accent-strong
ring-module-accent         ring-module-accent-strong
```

All standard Tailwind opacity modifiers from the registered scale
(`0, 5, 8, 10, 15, 20, 25, …`) work. Non-registered steps (`/12`, `/18`)
are silently dropped — see `AGENTS.md` hard rule #8.

## Testing

```ts
import { moduleAccentRgb } from "@sergeant/design-tokens/tokens";
import { ModuleAccentProvider } from "@shared/components/layout";

it("публікує --module-accent-rgb + strong для finyk", () => {
  const { container } = render(
    <ModuleAccentProvider module="finyk">
      <div />
    </ModuleAccentProvider>,
  );
  const wrapper = container.firstChild as HTMLElement;
  expect(wrapper.style.getPropertyValue("--module-accent-rgb")).toBe(
    moduleAccentRgb.finyk.default,
  );
  expect(wrapper.style.getPropertyValue("--module-accent-strong-rgb")).toBe(
    moduleAccentRgb.finyk.strong,
  );
});
```

`ModuleAccentProvider.test.tsx` covers all 4 modules + data attribute.

## Related docs

- [`docs/design/BRANDBOOK.md`](./BRANDBOOK.md) — WCAG-AA `-strong` Tier
  - full per-family contrast table.
- [`docs/design/brand-palette-wcag-aa-proposal.md`](./brand-palette-wcag-aa-proposal.md) — migration history (PRs #854 / #855 / #857).
- `AGENTS.md` hard rule #8 — Tailwind opacity scale.
- `AGENTS.md` hard rule #9 — `-strong` companion behind `text-white`.
