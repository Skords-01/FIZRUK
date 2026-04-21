/**
 * Composite key used to map a per-day note onto a `(habitId, dateKey)`
 * pair inside `RoutineState.completionNotes`.
 *
 * Extracted verbatim from
 * `apps/web/src/modules/routine/lib/completionNoteKey.ts`.
 */
export function completionNoteKey(habitId: string, dateKey: string): string {
  return `${habitId}__${dateKey}`;
}
