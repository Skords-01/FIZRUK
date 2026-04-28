import { useCallback, useEffect } from "react";
import { Icon } from "@shared/components/ui/Icon";
import { Button } from "@shared/components/ui/Button";
import { trackEvent, ANALYTICS_EVENTS } from "../observability/analytics";
import { dismissNudge, type NudgeDefinition } from "@sergeant/shared";
import { webKVStore } from "@shared/lib/storage";

export function DailyNudge({
  nudge,
  sessionDays,
  onDismiss,
  onAction,
}: {
  nudge: NudgeDefinition;
  sessionDays: number;
  onDismiss: () => void;
  onAction?: () => void;
}) {
  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.DAILY_NUDGE_SHOWN, {
      day: sessionDays,
      nudgeId: nudge.id,
    });
  }, [nudge.id, sessionDays]);

  const handleDismiss = useCallback(() => {
    dismissNudge(webKVStore, nudge.id);
    trackEvent(ANALYTICS_EVENTS.DAILY_NUDGE_DISMISSED, {
      day: sessionDays,
      nudgeId: nudge.id,
    });
    onDismiss();
  }, [nudge.id, sessionDays, onDismiss]);

  const handleClick = useCallback(() => {
    dismissNudge(webKVStore, nudge.id);
    trackEvent(ANALYTICS_EVENTS.DAILY_NUDGE_CLICKED, {
      day: sessionDays,
      nudgeId: nudge.id,
    });
    onAction?.();
    onDismiss();
  }, [nudge.id, sessionDays, onAction, onDismiss]);

  return (
    <section
      className="relative bg-panel border border-brand-500/20 rounded-2xl p-4 shadow-card"
      aria-label="Щоденна порада"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          <Icon name="sparkle" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text leading-relaxed">{nudge.message}</p>
          <div className="flex items-center gap-2 mt-2.5">
            {onAction && (
              <Button variant="primary" size="xs" onClick={handleClick}>
                Спробувати
              </Button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-muted hover:text-text px-2 py-1 rounded-lg transition-colors"
            >
              Зрозуміло
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 -mt-1 -mr-1 w-6 h-6 rounded-md flex items-center justify-center text-muted hover:text-text transition-colors"
          aria-label="Сховати"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </section>
  );
}
