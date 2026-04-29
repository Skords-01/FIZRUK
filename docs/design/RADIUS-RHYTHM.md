# Border-radius rhythm

> **Last validated:** 2026-04-28 by @Skords-01. **Next review:** 2026-07-27.
> **Status:** Active

> **Audience:** anyone writing UI in `apps/web` or `apps/mobile`.
> **Goal:** prevent border-radius drift — pick the right radius from a small,
> size-driven scale instead of inventing a one-off value.

Sergeant uses a **size-driven** radius scale: bigger element = bigger
radius. The scale is already encoded in shared components
(`Button`, `Card`, `Modal`, …) — you almost never need to write
`rounded-*` directly. When you do, pick from this table.

## The scale

| Token                   | Tailwind class | px    | Where to use                                                                                         |
| ----------------------- | -------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| **Swatch**              | `rounded-sm`   | 2 px  | Tiny coloured markers (heatmap cells, chart legend dots, macro-pie swatches).                        |
| **Marker**              | `rounded-md`   | 6 px  | 5 × 5 / 6 × 6 px elements (checkbox squares, badge chips, in-place pill labels).                     |
| **Control (sm)**        | `rounded-xl`   | 12 px | `Button` size `xs`/`sm`; icon-buttons `≤ 40 px`; small input chips; `IconButton` rail.               |
| **Card / Control (md)** | `rounded-2xl`  | 16 px | `Button` size `md`/`lg`; `Card` `radius="lg"` (default content surfaces); `IconButton` ≥ 44 px.      |
| **Hero / Control (xl)** | `rounded-3xl`  | 24 px | `Button` size `xl`; `Card` `radius="xl"` (hero / module-branded); `Modal` shell; bottom-sheet shell. |
| **Pill**                | `rounded-full` | ∞     | FAB; circular avatars; status dots; module-bento tile gradients; toggle pills.                       |

There is **no** semantic alias layer (`rounded-card` / `rounded-control`).
Tailwind already gives you the right primitive — adding aliases just
creates two names for the same thing, which causes more drift, not less.

## The rules

1. **Prefer the component, not the class.** If a `Button`/`Card`/`Modal`
   already exists, use it with the appropriate size/variant. Don't
   re-create one with raw `<div className="bg-panel rounded-2xl …">`.

2. **Match the size to the element.** A 48 × 48 px icon-button uses
   `rounded-2xl`, not `rounded-xl` (too sharp for that footprint) and
   not `rounded-3xl` (over-rounded — it starts looking like a pill).
   A 32 × 32 icon-button uses `rounded-xl`, not `rounded-2xl`.

3. **Don't introduce `rounded-lg` (8 px)** — it sits between Marker and
   Control with no clear semantic role. The 53 existing usages are a
   legacy of pre-rhythm code; new code should round up to `rounded-xl`
   or down to `rounded-md` based on the element's footprint.

4. **Don't introduce `rounded-4xl` / `rounded-5xl`** — those tokens
   exist in the Tailwind preset for one-off illustration uses (e.g.
   onboarding hero blob). They are **not** part of the regular rhythm.

5. **`rounded-full` is reserved for circles, FABs, and pills.** Don't
   use it on rectangular surfaces "to look modern" — that's a different
   visual language (Memoji-iOS) and clashes with Sergeant's bento.

## Anti-patterns

```tsx
// ❌ Hardcoded `rounded-md` on a 48-px icon-button — too sharp,
// looks like a chunky checkbox.
<button className="w-12 h-12 rounded-md …" />

// ✅ 48-px → `rounded-2xl` (matches Card / Button size=md).
<button className="w-12 h-12 rounded-2xl …" />
```

```tsx
// ❌ Inline 12-px button with `rounded-3xl` — over-rounded; reads as
// a pill, conflicts with the Button component's xl size mapping.
<button className="h-9 px-3 rounded-3xl …" />

// ✅ Use the existing Button.
<Button size="sm">…</Button>
```

```tsx
// ❌ Ad-hoc rounded-lg for an inline chip — sits between Marker and
// Control with no clear role.
<span className="px-1.5 py-0.5 rounded-lg bg-brand-500/10 …" />

// ✅ Marker (`rounded-md`) for chip-sized labels.
<span className="px-1.5 py-0.5 rounded-md bg-brand-500/10 …" />
```

## How this is enforced

Today: code review + this doc. There is no lint rule yet.

If radius drift becomes a problem in the future, candidate rules:

- Disallow `rounded-lg` outside of `packages/design-tokens` migration
  paths.
- Warn when raw `rounded-2xl` / `rounded-3xl` is used instead of
  `<Card>` / `<Button>` for 100 × 100+ surfaces.
- Disallow `rounded-4xl` / `rounded-5xl` outside of
  `apps/web/src/core/onboarding/**`.

## Why no semantic aliases?

We considered adding `rounded-control` / `rounded-card` / `rounded-pill`
in the Tailwind preset. We chose **not** to:

- Aliases create two names for the same primitive (`rounded-card` and
  `rounded-2xl`). New contributors search for one or the other and end
  up with mixed usage — actively worse than the status quo.
- The radius scale is already short (5 active steps); naming it twice
  doesn't reduce cognitive load.
- The component layer (`Card`, `Button`, `Modal`) already provides the
  semantic indirection: `<Card radius="lg">` not
  `<Card radius="rounded-2xl">`. That's where naming should live.

If a future shape changes (e.g. all cards become 18 px instead of 16 px),
the change happens in the component, not at the token level.
