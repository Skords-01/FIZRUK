# Empty states

> **Audience:** anyone writing UI in `apps/web` or `apps/mobile`.
> **Goal:** consistent treatment of "no data yet" — pick the right
> tier for the surface, don't invent a one-off.

Sergeant has a fully-featured `<EmptyState>` component
(`apps/web/src/shared/components/ui/EmptyState.tsx`) with an animated
icon, title/description/hint/example-preview/action slots, and module-
accent tinting. Most module entry points already use it
(`Transactions`, `Budgets`, `WorkoutCatalogSection`, `Exercise`,
`Progress`, `RoutineCalendarPanel`, `LogCard`, `Analytics`, …).

There are **three tiers** of empty-state treatment. Pick by surface.

## Tier 1 — Full screen / hero

When the module's primary surface has no data yet, use
`<ModuleEmptyState>` (a curated wrapper over `<EmptyState>`):

```tsx
<ModuleEmptyState module="finyk" onAction={() => openAddSheet()} />
```

It comes with module-tuned copy, icon, hint, and an example-preview
card — all per-module. Use this for the **first run** of a module.

For non-module screens (Hub-search, Reports), use the bare
`<EmptyState>` and pass copy yourself.

## Tier 2 — Compact / inline-card

When a sub-card inside a populated screen has nothing to show
(e.g. "Saved templates" card with no templates yet, but the rest of
the screen has data), use `<EmptyState compact>`:

```tsx
<EmptyState
  compact
  icon={<Icon name="dumbbell" size={20} />}
  title="Поки немає шаблонів"
  description="Створи свій перший — кнопка вище."
  module="fizruk"
/>
```

`compact` shrinks the icon (40 px instead of 56 px) and the padding
(`py-8` instead of `py-14`). It's the right size for a card-internal
empty surface (~120-180 px tall).

**Don't repeat the action** if a primary CTA is already visible on
the same screen. The empty state is descriptive, not a duplicate
button.

## Tier 3 — Inline text (≤ 1 line)

For tiny cards — chart legends, mini-stats inside an analytics grid,
sheet sub-sections — a single muted line is correct. `EmptyState`
would dominate an 80 px stat-card.

```tsx
{statsRows.length === 0 ? (
  <div className="text-xs text-muted">Поки що порожньо</div>
) : (
  …
)}
```

Style guide for tier 3:

- `text-xs text-muted` (or `text-subtle` for an even quieter note).
- Center if the surrounding card centers content; otherwise left-align.
- One short sentence. No CTA, no icon. If you need either — go up to
  tier 2.

## When tier 1 vs tier 2 vs tier 3?

Decide by **surface size** and **whether this is the user's first
time**, not by container type:

| Surface                                                       | Tier   |
| ------------------------------------------------------------- | ------ |
| Module landing page, no data yet (first run)                  | 1      |
| Empty page after a filter (e.g. "no transactions in March")   | 1 or 2 |
| Card section with no items (e.g. saved templates list)        | 2      |
| Mini stat-card (40-120 px tall)                               | 3      |
| Action-sheet sub-section (e.g. "no templates assigned today") | 3      |

## Copy guidelines

- **Ukrainian, "ти" form** (Sergeant tone — see Wave 1 PR #1126).
- Title is a state, not an instruction: "Поки немає шаблонів", not
  "Створи шаблон". The action button carries the verb.
- Description is one sentence; if you can't say it in one, the
  empty-state is too complex for this surface — ladder to tier 2 / 1.
- Hint (tier 1) is a _helpful aside_, not a duplicate of description.
  Good: "Порада: підключи Monobank — імпорт автоматично." Bad:
  "Тут зараз порожньо."

## Anti-patterns

```tsx
// ❌ Tier-1 EmptyState inside a 100-px tall stat-card.
// The icon is bigger than the card, looks broken.
<div className="bg-panelHi rounded-2xl px-3 py-3">
  <SectionHeading>Топ страв</SectionHeading>
  <EmptyState icon={<Icon name="utensils" size={24} />}
              title="Ще немає улюблених страв"
              description="…" />
</div>

// ✅ Tier 3 — one muted line.
<div className="bg-panelHi rounded-2xl px-3 py-3">
  <SectionHeading>Топ страв</SectionHeading>
  {top.length === 0 ? (
    <div className="text-xs text-muted">Поки що порожньо</div>
  ) : …}
</div>
```

```tsx
// ❌ Tier-3 bare text on a full module page, first run.
// User has no idea what this module does or how to start.
{
  txs.length === 0 && (
    <p className="text-xs text-subtle">Транзакцій ще немає.</p>
  );
}

// ✅ Tier 1 — ModuleEmptyState with action.
{
  txs.length === 0 && (
    <ModuleEmptyState module="finyk" onAction={() => openManualExpense()} />
  );
}
```

```tsx
// ❌ Action button duplicated — the page already has a "+ Новий
// шаблон" button at the top, and the empty state shows another one
// 60 px below it. Visual noise; user clicks one of them at random.
<>
  <Button onClick={startNew}>+ Новий шаблон</Button>
  <Card>
    <EmptyState
      compact title="Поки немає шаблонів"
      action={<Button onClick={startNew}>Створити</Button>} />
  </Card>
</>

// ✅ Empty state is descriptive only; the CTA above is visible.
<>
  <Button onClick={startNew}>+ Новий шаблон</Button>
  <Card>
    <EmptyState
      compact title="Поки немає шаблонів"
      description="Створи свій перший — кнопка вище." />
  </Card>
</>
```

## How this is enforced

Today: code review + this doc.

If empty-state drift becomes a problem, candidate rules:

- Disallow bare `<p>Поки … немає…</p>` patterns outside of files
  marked with `// eslint-disable-next-line sergeant-design/empty-state-tier`.
- Warn when `<EmptyState compact>` is used in a container ≥ 250 px tall
  (probably wants tier 1).
