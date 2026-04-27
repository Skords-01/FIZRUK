import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@shared/lib/cn";
import { Icon } from "@shared/components/ui/Icon";
import { useDialogFocusTrap } from "@shared/hooks/useDialogFocusTrap";
import type { HubChatSession } from "./hubChatSessions";

interface HubChatHistoryDrawerProps {
  open: boolean;
  sessions: HubChatSession[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatStamp(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mo} ${hh}:${mm}`;
}

function userMessageCount(s: HubChatSession): number {
  return s.messages.filter((m) => m.role === "user").length;
}

export function HubChatHistoryDrawer({
  open,
  sessions,
  activeId,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}: HubChatHistoryDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useDialogFocusTrap(open, panelRef, { onEscape: onClose });

  // Sort newest-first by updatedAt so a freshly-touched session jumps
  // to the top, matching iOS Messages and Telegram conventions.
  const sortedSessions = useMemo(
    () => sessions.slice().sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDelete(id);
    },
    [onDelete],
  );

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Історія чатів"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-safe:animate-fade-in"
        onClick={onClose}
        aria-hidden
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className="relative flex flex-col w-[78%] max-w-xs bg-bg border-r border-line shadow-float motion-safe:animate-fade-in rounded-tr-3xl rounded-br-3xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line shrink-0">
          <div className="text-[15px] font-bold text-text">Бесіди</div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-text hover:bg-panelHi transition-colors"
            aria-label="Закрити список бесід"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onCreate();
          }}
          className="mx-3 mt-3 mb-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-brand-500/10 text-brand-strong hover:bg-brand-500/15 transition-colors text-sm font-semibold"
        >
          <Icon name="plus" size={14} />
          Нова бесіда
        </button>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {sortedSessions.length === 0 ? (
            <div className="text-center text-muted text-xs py-6">
              Поки немає інших бесід.
            </div>
          ) : (
            sortedSessions.map((s) => {
              const isActive = s.id === activeId;
              const msgs = userMessageCount(s);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "group relative flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                    isActive
                      ? "bg-brand-500/15 text-text"
                      : "hover:bg-panelHi text-text",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => onSelect(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(s.id);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {s.title}
                    </div>
                    <div className="text-2xs text-muted mt-0.5 flex items-center gap-1.5">
                      <span>{formatStamp(s.updatedAt)}</span>
                      <span className="text-line">·</span>
                      <span>
                        {msgs} {msgs === 1 ? "повідомлення" : "повідомлень"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, s.id)}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-subtle/60 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 hover:text-danger hover:bg-danger/10 transition-[color,background-color,opacity]"
                    aria-label={`Видалити бесіду ${s.title}`}
                    title="Видалити"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
