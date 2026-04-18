import { cn } from "@shared/lib/cn";

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Закрити"
      />
      <div className="relative w-full max-w-sm bg-panel border border-line rounded-2xl shadow-soft p-5 z-10">
        <h2 className="text-base font-bold text-text">{title}</h2>
        {body && <p className="text-sm text-muted mt-2">{body}</p>}
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            className="flex-1 py-3 rounded-xl border border-line text-sm font-semibold text-muted hover:bg-panelHi transition-colors"
            onClick={onCancel}
          >
            Скасувати
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors",
              danger
                ? "bg-danger hover:bg-danger/90"
                : "bg-emerald-600 hover:bg-emerald-700",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
