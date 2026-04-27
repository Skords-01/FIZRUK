# Routine chat tools: `set_habit_schedule` + `pause_habit`

> **Status:** shipped (PR [#797](https://github.com/Skords-01/Sergeant/pull/797),
> catalogue rows у [#798](https://github.com/Skords-01/Sergeant/pull/798),
> dedup у [#800](https://github.com/Skords-01/Sergeant/pull/800)).
> `paused` доданий у `packages/routine-domain` (`types.ts`, `schedule.ts`,
> `domain/reminders/weekday.ts`); серверні tool defs — `apps/server/src/modules/chat/toolDefs/routine.ts`;
> client handlers — `apps/web/src/core/lib/chatActions/routineActions.ts`;
> `SYSTEM_PROMPT_VERSION = "v6"`; cards мають `set_habit_schedule` / `pause_habit`.
>
> Authors: Devin (session: dbc81f8c) for @Skords-01
> Created: 2026-04-26

## Problem

The HubChat assistant can already create / edit / archive habits, but two
common natural-language requests are awkward:

1. **"Тренування — пн / ср / пт"** — setting an exact weekly day pattern via
   `edit_habit` requires the model to emit numeric `weekdays: [0, 2, 4]`. The
   existing `create_habit` / `edit_habit` tool descriptions also use a
   confusing Sun-first numbering (`0 — неділя`) that contradicts the
   domain's Mon-first convention (`packages/routine-domain` uses `0 = Mon`).
2. **"Постав звичку 'Біг' на паузу на цей тиждень"** — there is no way to
   temporarily disable a habit without deleting / archiving it. `archived`
   is semantically "removed from active list"; pause should be a softer,
   reversible toggle.

## Goals

- Add two HubChat tools dedicated to these flows:
  - `set_habit_schedule(habit_id, days)` — set exact weekdays for a habit
    using human-readable day names (English or Ukrainian aliases).
  - `pause_habit(habit_id, paused?)` — toggle a `paused` flag on a habit.
- Make pause respect calendar / streak / reminder logic so it works
  consistently across web and mobile.
- Bump `SYSTEM_PROMPT_VERSION` and update the routine tool list in
  `SYSTEM_PREFIX`.

## Non-goals

- Auto-unpause / `paused_until` (explicitly out of scope per user
  decision; pause is a manual on/off toggle).
- Migrating existing `create_habit` / `edit_habit` tool descriptions
  away from Sun-first numbering — that's a pre-existing quirk that
  belongs in a separate cleanup PR.
- UI for pause / day-picker in the routine module (`apps/web/src/modules/routine/**`)
  — the field flows through chat tools and the existing habit editor;
  surfaces in the dedicated UI can land in follow-ups.
- Mobile push-reminder behavior changes beyond what falls out
  automatically from `habitScheduledOnDate()` already being respected.
- Adding entries to `packages/shared/src/lib/assistantCatalogue.ts` —
  the precedent set by PR #794 (which added `find_transaction` and
  `batch_categorize` without catalogue entries) is that new chat tools
  don't require catalogue rows. A catalogue update can ride a separate
  doc PR.

## Confirmed decisions

- `pause_habit`: simple toggle `paused: true | false`. No
  `paused_until`, no scheduled auto-unpause.
- `set_habit_schedule`: input shape `days: string[]`, accepting both
  English short names (`"mon"`, `"tue"`, …, `"sun"`) and Ukrainian
  short names (`"пн"`, `"вт"`, `"ср"`, `"чт"`, `"пт"`, `"сб"`, `"нд"`).
  The handler normalises into the existing **Mon-first** numeric
  `weekdays` array (`0 = Mon … 6 = Sun`) and forces
  `recurrence: "weekly"`.

## Approach (chosen: domain-first)

`paused` is a domain concept that affects scheduling, not a web-only
storage flag. We add it to the shared domain so any consumer
(`apps/web`, `apps/mobile`, future server-side aggregations) gets the
correct behavior automatically.

### Domain changes — `packages/routine-domain`

`src/types.ts`:

```ts
export interface Habit {
  // …existing…
  archived?: boolean;
  paused?: boolean; // new — soft, reversible disable
  // …existing…
}

export interface HabitDraftPatch {
  // …existing…
  paused?: boolean; // new — patchable via edit flows
}

export interface HabitDraft {
  // …existing…
  paused: boolean; // new — controlled form value, default false
}
```

`src/schedule.ts → habitScheduledOnDate()`:

```ts
export function habitScheduledOnDate(habit: Habit, dateKey: string): boolean {
  if (habit.archived) return false;
  if (habit.paused) return false; // new
  // …existing…
}
```

`src/domain/reminders/weekday.ts → habitActiveRoutineWeekdays()`:

This helper currently early-returns `[]` for `archived` habits but
ignores `paused`. Mobile (and any other reminder-scheduling code)
reads it directly, **not** through `habitScheduledOnDate()`, so it
must learn about `paused`:

```ts
export function habitActiveRoutineWeekdays(
  h: Pick<Habit, "recurrence" | "weekdays" | "archived" | "paused">,
): number[] {
  if (h.archived) return [];
  if (h.paused) return []; // new — paused habits do not schedule reminders
  // …existing…
}
```

Add a regression test in `domain/reminders/weekday.test.ts`:

```
it("returns [] for a paused habit regardless of recurrence", () => {
  expect(
    habitActiveRoutineWeekdays({ recurrence: "daily", paused: true }),
  ).toEqual([]);
});
```

`src/schedule.test.ts` — add a regression test:

```
it("paused habit is not scheduled", () => {
  expect(
    habitScheduledOnDate(
      { id: "h", name: "x", recurrence: "daily", paused: true },
      "2026-04-26",
    ),
  ).toBe(false);
});
```

### Server tool defs — `apps/server/src/modules/chat/toolDefs/routine.ts`

Append two new entries to `ROUTINE_TOOLS`:

```ts
{
  name: "set_habit_schedule",
  description:
    "Виставити точні дні тижня для звички (recurrence='weekly'). Передавай дні у форматі 'mon|tue|wed|thu|fri|sat|sun' або українською коротко 'пн|вт|ср|чт|пт|сб|нд'. Наприклад: користувач каже 'тренування пн/ср/пт' → days=['mon','wed','fri'].",
  input_schema: {
    type: "object",
    properties: {
      habit_id: { type: "string", description: "ID звички" },
      days: {
        type: "array",
        description:
          "Дні тижня: англ. ('mon','tue',...,'sun') або укр. ('пн','вт','ср','чт','пт','сб','нд'). Регістр не важливий.",
        items: { type: "string" },
      },
    },
    required: ["habit_id", "days"],
  },
},
{
  name: "pause_habit",
  description:
    "Тимчасово поставити звичку на паузу (або зняти з паузи). Не видаляє і не архівує. Ідемпотентно: повторний виклик з тим самим прапором — no-op.",
  input_schema: {
    type: "object",
    properties: {
      habit_id: { type: "string", description: "ID звички" },
      paused: {
        type: "boolean",
        description:
          "true=поставити на паузу (default), false=зняти з паузи",
      },
    },
    required: ["habit_id"],
  },
},
```

### System prompt — `apps/server/src/modules/chat/toolDefs/systemPrompt.ts`

- Update the `Рутина:` line in `SYSTEM_PREFIX` to include
  `set_habit_schedule, pause_habit` in the comma-separated list.
- Bump `SYSTEM_PROMPT_VERSION` from `"v5"` to `"v6"`.

### Client action types — `apps/web/src/core/lib/chatActions/types.ts`

```ts
export interface SetHabitScheduleAction extends ChatActionBase {
  name: "set_habit_schedule";
  input: {
    habit_id: string;
    days: string[];
  };
}

export interface PauseHabitAction extends ChatActionBase {
  name: "pause_habit";
  input: {
    habit_id: string;
    paused?: boolean;
  };
}
```

Add both to the `ChatAction` discriminated union and re-export.

### Client handlers — `apps/web/src/core/lib/chatActions/routineActions.ts`

Two new `case` branches in `handleRoutineAction`:

- **`set_habit_schedule`**:
  1. Validate `habit_id`. Reject empty.
  2. Normalise each entry of `days` via a `normalizeDayToken(s)` helper:
     - lowercase, trim;
     - English: `mon→0, tue→1, wed→2, thu→3, fri→4, sat→5, sun→6`;
     - Ukrainian: `пн→0, вт→1, ср→2, чт→3, пт→4, сб→5, нд→6`;
     - else `null` (skip with warning aggregated into a single message).
  3. De-dup, sort ascending. Reject if empty after normalisation.
  4. Update the matching habit in `hub_routine_v1`:
     `recurrence = "weekly"`, `weekdays = <numeric array>`.
  5. Return human-readable summary, e.g.
     `"Розклад звички "Тренування" — Пн, Ср, Пт"`.
- **`pause_habit`**:
  1. Validate `habit_id`. Reject empty.
  2. `target = input.paused !== false` (default true → pausing).
  3. If habit is already in target state — return idempotent message.
  4. Else write `paused: target` and return
     `"Звичку "X" поставлено на паузу"` /
     `"Звичку "X" знято з паузи"`.

Both handlers use the existing `ls` / `lsSet` helpers (per
`AGENTS.md` chat-actions rule). Day-name normalisation lives inside
the handler file (no need to extend a shared util for two tools).

### Action cards — `apps/web/src/core/lib/hubChatActionCards.ts`

Add to `KNOWN_TOOLS`, `iconFor()`, and `titleFor()`:

- `set_habit_schedule` — icon `calendar`, title
  `"Розклад звички оновлено${failedSuffix}"`, summary lists
  the chosen days.
- `pause_habit` — icon `pause-circle`, title
  `"Звичку поставлено на паузу${failedSuffix}"` (use the same title for
  unpause; the body text differentiates).

Neither tool goes into `RISKY_TOOLS` — both are reversible toggles.

### Tests

- `packages/routine-domain/src/schedule.test.ts` — paused habit is not
  scheduled (covers `daily`, `weekly`, `weekdays`, `monthly`, `once`).
- `apps/web/src/core/lib/hubChatActionsExtended.test.ts` — happy path +
  error path for each handler:
  - `set_habit_schedule`: English, Ukrainian, mixed, invalid token,
    empty after normalisation, missing habit, missing `habit_id`.
  - `pause_habit`: pause, unpause, idempotent re-pause, missing
    `habit_id`, missing habit.
- `apps/web/src/core/lib/hubChatActionCards.test.ts` — title / icon /
  summary for both tools (success and `failed` variants).
- `apps/server/src/modules/chat/chat.test.ts` — only update if it asserts
  against the routine tool registry; otherwise no change needed.

## Test strategy

- Domain-level: vitest in `@sergeant/routine-domain`.
- Web handlers + cards: vitest in `apps/web`.
- Server: vitest run of `apps/server/src/modules/chat/chat.test.ts` to
  catch tool-registry regressions and `SYSTEM_PROMPT_VERSION`
  snapshot changes (if any).
- No new e2e / Playwright work — flow is exercised through the
  HubChat tool harness.

## Migration / rollout

- `paused` is purely additive on `Habit`. Old persisted state
  (no `paused` field) reads as `paused !== true`, so it remains active
  — no data migration needed.
- `SYSTEM_PROMPT_VERSION` bump invalidates Anthropic prompt cache as
  documented in `AGENTS.md`. This is expected and tracked through
  `cache_creation_input_tokens > 0` in observability.

## Risks

- **Mobile reminders**: `apps/mobile` schedules push reminders by
  reading `habitActiveRoutineWeekdays()` directly (not via
  `habitScheduledOnDate()`). The spec adds an explicit
  `if (h.paused) return [];` early-return there so paused habits stop
  being scheduled across both web and mobile.
- **Localisation drift**: hardcoding seven Ukrainian aliases inside the
  handler is duplicative with `WEEKDAY_LABELS` in
  `packages/routine-domain/src/constants.ts`. Acceptable for two tools;
  if a third tool needs the same map, extract to a shared util in a
  follow-up.
- **LLM emitting numeric `weekdays`**: model may pass `[0,2,4]` instead
  of `["mon","wed","fri"]`. Handler should ignore this and rely on the
  tool description to steer the LLM; keeping the input strictly
  `string[]` makes the contract obvious. Numeric-pass cases get
  rejected with a friendly error.

## Conventional Commits

- Scope: PR touches `apps/web`, `apps/server`, and
  `packages/routine-domain`. Most user-visible scope is `web` (the
  HubChat handlers / cards). Commit subject:
  `feat(web): add set_habit_schedule + pause_habit chat tools`.
  Body lists routine-domain + server changes.
