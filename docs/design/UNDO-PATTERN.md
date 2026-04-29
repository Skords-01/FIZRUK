# Undo pattern — soft-delete + 5 s undo toast

> **Last validated:** 2026-04-28 by @Skords-01. **Next review:** 2026-07-27.
> **Status:** Active

> Sergeant's unified destructive-action pattern. Use `showUndoToast`
> instead of `window.confirm()`, instead of a custom "Are you sure?"
> dialog, instead of a silent delete. Confirmation dialogs are
> reserved for **non-reversible** flows.

## TL;DR

```tsx
import { useToast } from "@shared/hooks/useToast";
import { showUndoToast } from "@shared/lib/undoToast";

const toast = useToast();

const handleDelete = (id: string) => {
  const snapshot = items.find((x) => x.id === id);
  if (!snapshot) return;

  setItems((prev) => prev.filter((x) => x.id !== id));

  showUndoToast(toast, {
    msg: `Видалено «${snapshot.name}»`,
    onUndo: () => setItems((prev) => [...prev, snapshot]),
  });
};
```

That's it. Five seconds, one undo button, haptic feedback on both
appearance and undo, optimistic UI removal, no modal interrupting flow.

## Why this pattern

Pre-Sergeant we had three competing destructive-action patterns:

1. **Hard delete + `window.confirm()`** — interrupts flow, no recovery
   if the user mis-clicks "OK".
2. **Custom modal `<ConfirmDialog>`** — same interruption, plus the
   inconsistency tax of writing modal logic per delete site.
3. **Silent hard delete** — single tap and the data is gone forever.
   This is the worst variant; especially painful for fat-finger taps
   on mobile.

The unified undo policy replaces all three with one rule: **deletes
are soft and reversible for 5 seconds; confirmations are only used
when the action genuinely cannot be undone.**

| User action                  | Old patterns                                                | Unified pattern                         |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| Delete a transaction         | `window.confirm("Видалити?")`                               | Optimistic remove + 5 s undo toast      |
| Delete a habit               | `<ConfirmDialog>` "Видалити?"                               | Optimistic remove + 5 s undo toast      |
| Delete a tag                 | _silent delete_                                             | Optimistic remove + 5 s undo toast      |
| Drop a workout               | confirm + delete                                            | Optimistic remove + 5 s undo toast      |
| Trim journal history         | `<ConfirmDialog>` (year-old data, hard)                     | **Keep ConfirmDialog** — non-reversible |
| Detach exercise from catalog | `<ConfirmDialog>` (still has `showUndoToast` after confirm) | Hybrid — confirm + undo                 |

## When NOT to use undo (keep ConfirmDialog)

The few exceptions in the codebase, with reasoning:

- **`LogCard` "Видалити стару історію"** — trims everything older than
  365 days; potentially hundreds of deletions; restoring would require
  snapshotting megabytes of meal data. Confirm + hard delete.
- **`HubChat` "Очистити всі чати"** — bulk operation across all sessions;
  irreversible by design.
- **`Workouts` "Видалити вправу з каталогу"** — detaches the exercise
  from any historical workouts. Records survive but lose their
  catalog metadata. Confirm to make the consequence explicit; we
  _also_ offer a 5 s undo on the exercise itself, but the historical
  detach is non-reversible.

If you find yourself reaching for `<ConfirmDialog>` for a delete, ask:
"can I just snapshot and restore?" If yes — use `showUndoToast`.

## API

```ts
showUndoToast(toast, {
  msg: ReactNode,                  // "Видалено звичку «Вода»"
  duration?: number,               // default 5000 (ms)
  undoLabel?: string,              // default "Повернути"
  onUndo: () => void,              // restore the snapshot
  onUndoErrorMsg?: ReactNode,      // shown if onUndo throws
});
```

Defaults live in `@sergeant/shared` (`UNDO_TOAST_DEFAULT_*`) so web and
mobile stay aligned.

## Snapshot strategies

Two patterns are used in the codebase. Pick the one that fits your
storage shape.

### A. Item snapshot (RQ / array state)

Best when the list is plain and the item carries its own ID:

```tsx
const snapshot = items.find((x) => x.id === id);
setItems((prev) => prev.filter((x) => x.id !== id));
showUndoToast(toast, {
  msg: `Видалено «${snapshot.name}»`,
  onUndo: () => setItems((prev) => [...prev, snapshot]),
});
```

Used by: `Transactions.tsx`, `AssetsTable.tsx`, `MemoryBankSection.tsx`.

### B. Full-state snapshot (reducers / cascading deletes)

Best when the deletion has side-effects (orphaning relations, cascading
through joins, reordering arrays). Snapshot the **whole state** and
restore it as a single setter call:

```tsx
const snapshot = routine; // freeze the full RoutineState
setRoutine((s) => deleteTag(s, tagId));
showUndoToast(toast, {
  msg: `Видалено тег «${tag.name}»`,
  onUndo: () => setRoutine(snapshot),
});
```

Used by: `TagsSection.tsx`, `CategoriesSection.tsx`, `HabitsSection.tsx`.

> The full-state snapshot is **safe** for local-first stores because
> the 5 s window is short — concurrent edits from another tab are
> extremely rare and would only overwrite the snapshot path, not lose
> data permanently. For server-backed lists, prefer pattern A so
> concurrent server updates aren't clobbered on undo.

## Anti-patterns

```tsx
// ❌ BAD — silent delete; no recovery
<button onClick={() => deleteTag(tagId)} />;

// ❌ BAD — confirm dialog for a reversible action
if (window.confirm("Видалити тег?")) deleteTag(tagId);

// ❌ BAD — toast without undo button (just announcement)
toast.success("Тег видалено"); // no way to recover

// ❌ BAD — no haptic, no live region; relies only on visual
<div>Тег видалено · undo</div>;

// ✅ GOOD
const snapshot = routine;
setRoutine((s) => deleteTag(s, tagId));
showUndoToast(toast, {
  msg: `Видалено тег «${tag.name}»`,
  onUndo: () => setRoutine(snapshot),
});
```

## Copy guidelines

- **Past-tense** confirmation: "Видалено звичку «Вода»", not
  "Звичку «Вода» буде видалено".
- **Quote the name** in `«…»` so users can identify which item is
  affected when toasts queue.
- **Include side-effect detail** when the action cascades:
  "Видалено тег «дім» (відʼєднано від 4)".
- **Default undo label**: `"Повернути"` (set in `@sergeant/shared`).
  Don't override unless the action is unusual (e.g. "Підняти" for
  an "archive" flow).

## Haptic + a11y

`showUndoToast` automatically:

- Fires `hapticWarning()` when the toast appears (dangerous-action
  feedback on iOS).
- Fires `hapticTap()` when the user taps the undo button.
- Fires `hapticError()` if `onUndo` throws.
- Wraps `onUndo` in a `try/catch` and surfaces a follow-up error toast
  via `toast.error(onUndoErrorMsg)` so the user knows the restore
  failed (instead of silently swallowing the exception, which used to
  hide localStorage-quota errors).

Toasts are rendered via the `useToast` provider, which is wired to the
app-level live region, so screen-reader users hear the message and the
undo button receives keyboard focus normally.

## Migration checklist

When adopting this pattern in a new module:

1. Import `showUndoToast` and `useToast`.
2. Snapshot the item (or full state) before mutating.
3. Apply the optimistic mutation.
4. Call `showUndoToast(toast, { msg, onUndo })`.
5. Remove any `window.confirm()` / `<ConfirmDialog>` for this action
   unless it falls under the "non-reversible" exceptions above.
6. Verify haptics fire on a real device — `useToast` does not call
   `hapticTap()` for non-undo toasts; this is intentional, but worth
   sanity-checking.

## Related docs

- [`apps/web/src/shared/lib/undoToast.tsx`](../../apps/web/src/shared/lib/undoToast.tsx) — implementation.
- [`apps/web/src/shared/lib/undoToast.test.tsx`](../../apps/web/src/shared/lib/undoToast.test.tsx) — contract tests.
- [`packages/shared/src/lib/undoToast.ts`](../../packages/shared/src/lib/undoToast.ts) — defaults shared with mobile.
- `AGENTS.md` § Soft rules — "Destructive UX defaults".
