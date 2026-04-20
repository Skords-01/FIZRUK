export interface FinykAuthErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onOpenHub?: () => void;
}

/**
 * Floating banner shown at the top of the main Finyk view when Monobank
 * rejects the saved token. Stays module-local because the wording and
 * action (open hub settings to refresh the token) is Finyk-specific —
 * shared StorageErrorBanner is for quota failures.
 */
export function FinykAuthErrorBanner({
  message,
  onDismiss,
  onOpenHub,
}: FinykAuthErrorBannerProps) {
  return (
    <div className="fixed top-[calc(56px+env(safe-area-inset-top,0px)+8px)] left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-warning/15 border border-warning/40 rounded-2xl px-4 py-3 flex items-start gap-3 shadow-card">
        <span className="text-lg shrink-0 mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text">
            Токен потребує оновлення
          </p>
          <p className="text-xs text-muted mt-0.5">{message}</p>
          {onOpenHub && (
            <button
              onClick={onOpenHub}
              className="text-xs font-semibold text-primary mt-2 hover:underline"
            >
              Оновити токен у Налаштуваннях Hub
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-muted hover:text-text transition-colors shrink-0"
          aria-label="Закрити"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
