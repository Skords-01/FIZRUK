# Sergeant Component API — naming conventions

> Last reviewed: 2026-04-26. Reviewer: @Skords-01

This document is the single source of truth for **prop names** and
**brand-colour values** across the design-system primitives in
`apps/web/src/shared/components/ui`. It covers the trio of overlapping
names (`variant` / `style` / `tone`) that historically drifted across
components and the deliberate value differences between Button, form
fields, and navigation primitives.

---

## 1. Two-dimensional API

Most primitives have two visual axes:

1. **Colour** — which palette the component renders in (brand,
   semantic, or per-module).
2. **Style** — how that colour is applied (filled, outlined, soft
   tint, underline, …).

The codebase uses two prop names for these axes:

| Axis       | Prop name | Used by                                                                           |
| ---------- | --------- | --------------------------------------------------------------------------------- |
| **Colour** | `variant` | Button, Input, Select, Card, Banner, Badge, Tabs, Segmented, Stat, SectionHeading |
| **Style**  | `style`   | Tabs, Segmented                                                                   |
| **Style**  | `tone`    | Badge (soft / solid / outline)                                                    |

> **Rule of thumb.** `variant` always means **colour / palette**.
> The second axis (style of fill) is called `style` on the navigation
> primitives (Tabs, Segmented). Badge keeps the historical `tone` prop
> for its soft / solid / outline switch — it's stable, well-known, and
> doesn't collide with anything else (Badge has no `style` prop).

The deprecated names that used to exist — `TabsTone`, `TabsAccent`,
`SegmentedTone`, `SegmentedAccent`, `StatTone`, `SectionHeadingTone` —
have been removed. Re-exports from the barrel
(`apps/web/src/shared/components/ui/index.ts`) point at the new names:
`TabsStyle`, `TabsVariant`, `SegmentedStyle`, `SegmentedVariant`,
`StatVariant`, `SectionHeadingVariant`.

---

## 2. Brand-colour value: three contexts, three defaults

The most-used colour value across the system points to "the primary
brand colour", but its **value** differs by component. This is
intentional — the value reflects the semantic context the component
lives in:

| Context             | Components          | `variant` value | Why                                                                                                                                     |
| ------------------- | ------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Action**          | Button              | `"primary"`     | Buttons drive actions. The default action is the **primary** call-to-action (Save / Submit). The word matches users' design vocabulary. |
| **Form chrome**     | Input, Select, Card | `"default"`     | Form fields and surfaces start in a **default** neutral state and only opt into branded chrome (`"finyk"`, `"fizruk"`, …) when scoped.  |
| **Nav / selection** | Tabs, Segmented     | `"brand"`       | Navigation exposes the active section in the global brand palette and lets module pages override to `"finyk"` / `"fizruk"` / etc.       |

This is **deliberate, not drift**. Renaming all three to one shared
token (e.g. `"primary"` everywhere) would force unrelated decisions to
move together — a change to button styling would touch input chrome,
which would touch tab strips. Keeping them distinct lets each axis
evolve independently.

When you add a new component, pick the value that matches its role:

- Drives an action → `"primary"`.
- Renders form / surface chrome → `"default"`.
- Indicates active selection in a nav-like control → `"brand"`.

---

## 3. Per-component cheat sheet

### `Badge`

```tsx
<Badge variant="success" tone="soft" size="sm">
  3
</Badge>
```

- `variant`: `"neutral" | "accent" | "success" | "warning" | "danger" |
"info" | "finyk" | "fizruk" | "routine" | "nutrition"` — colour.
- `tone`: `"soft" | "solid" | "outline"` — fill style. Default `"soft"`.
- `size`: `"xs" | "sm" | "md"`.

### `Banner`

```tsx
<Banner variant="warning">…</Banner>
```

- `variant`: `"info" | "success" | "warning" | "danger"`.

### `Button`

```tsx
<Button variant="primary" size="md">
  Зберегти
</Button>
```

- `variant`: `"primary" | "secondary" | "ghost" | "danger" | "link" | …`.
  **Default `"primary"`** — see §2.

### `Card`

```tsx
<Card variant="default" padding="md" radius="lg">
  …
</Card>
```

- `variant`: `"default" | "interactive" | "flat" | "elevated" | "ghost"
| "finyk" | "fizruk" | …` (full set in `Card.tsx`). **Default
  `"default"`** — see §2.

### `Input` / `Select`

```tsx
<Input variant="default" />
<Select variant="default" />
```

- `variant`: `"default" | "filled" | "ghost"`. **Default `"default"`** —
  see §2.

### `Stat`

```tsx
<Stat label="Вага" value="82 кг" sublabel="+0.4 кг" variant="success" />
```

- `variant`: `"default" | "success" | "warning" | "danger" | "finyk" |
"fizruk" | "routine" | "nutrition"`. Default `"default"`.

### `SectionHeading` / `SectionHeader`

```tsx
<SectionHeading size="xs" variant="subtle">
  Огляд
</SectionHeading>
```

- `variant`: `"subtle" | "muted" | "text" | "accent" | "finyk" |
"fizruk" | "routine" | "nutrition"`. Default depends on `size`
  (eyebrow sizes default to `"subtle"`, body sizes to `"text"`).

### `Tabs`

```tsx
<Tabs items={…} value={…} onChange={…} variant="brand" style="underline" />
```

- `variant`: `"brand" | "finyk" | "fizruk" | "routine" | "nutrition"`.
  **Default `"brand"`** — see §2.
- `style`: `"underline" | "pill"`. Default `"underline"`.

### `Segmented`

```tsx
<Segmented items={…} value={…} onChange={…} variant="brand" style="soft" />
```

- `variant`: `"brand" | "fizruk" | "routine" | "nutrition" | "finyk"`.
  **Default `"brand"`** — see §2.
- `style`: `"solid" | "soft"`. Default `"soft"`.

---

## 4. When designing a new component

1. Default the colour prop to `variant`. Don't introduce a new name
   like `accent`, `palette`, `kind` — `variant` is the convention.
2. If the component has a second visual axis, call it `style` (the
   navigation convention) unless it specifically matches Badge's
   soft/solid/outline switch — in which case `tone` is acceptable for
   continuity.
3. Pick the brand-colour value (`"primary"` / `"default"` / `"brand"`)
   from §2 based on role. Don't invent a fourth.
4. Add the new component to §3 in the same PR. The cheat sheet is the
   contract; out-of-date docs here block review.
