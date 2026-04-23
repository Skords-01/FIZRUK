import { downloadJson } from "@sergeant/shared";
import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
import { buildFizrukBackupPayload } from "../../lib/fizrukStorage";

/**
 * Export-only variant of the Fizruk backup bar. The import flows
 * ("Імпорт (додати)" / "Імпорт (замінити)") were removed on user
 * request — keeping a one-way export button lets the user take a
 * snapshot of their workouts/exercises/journal without exposing a
 * destructive replace action from the Settings screen. The underlying
 * `applyFizrukBackupPayload` helper stays in `fizrukStorage.ts` in
 * case we want to restore the import surface later.
 */
export function WorkoutBackupBar({ className }) {
  const exportJson = async () => {
    const payload = buildFizrukBackupPayload();
    await downloadJson(
      `fizruk-backup-${new Date().toISOString().slice(0, 10)}.json`,
      payload,
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-panelHi/40 px-3 py-2.5 flex flex-col gap-3 text-xs text-subtle",
        className,
      )}
    >
      <p className="font-semibold text-text leading-snug">
        Резервна копія даних Фізрука (тренування, вправи, журнал).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 min-h-[44px]"
          type="button"
          onClick={exportJson}
        >
          Експорт JSON
        </Button>
      </div>
    </div>
  );
}
