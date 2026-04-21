/**
 * Routine streak + completion-rate helpers — moved into
 * `@sergeant/routine-domain` (Phase 5 / PR 2). Re-exports under the
 * historical import path so existing web call-sites and tests continue
 * to work unchanged.
 */

export {
  completionRateForRange,
  habitCompletionRate,
  maxActiveStreak,
  maxStreakAllTime,
  streakForHabit,
} from "@sergeant/routine-domain";
