import { useRef, useState, type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import { Icon } from "@shared/components/ui/Icon";
import { Card } from "@shared/components/ui/Card";
import { Switch } from "@shared/components/ui/Switch";
import { useDialogFocusTrap } from "@shared/hooks/useDialogFocusTrap";

interface ChevronIconProps {
  expanded: boolean;
}

function ChevronIcon({ expanded }: ChevronIconProps) {
  return (
    <Icon
      name="chevron-right"
      size={16}
      className={cn(
        "transition-transform duration-200 shrink-0",
        expanded && "rotate-90",
      )}
    />
  );
}

export interface SettingsGroupProps {
  title: string;
  emoji?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SettingsGroup({
  title,
  emoji,
  children,
  defaultOpen = false,
}: SettingsGroupProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <Card radius="lg" padding="none" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-2 hover:bg-panelHi/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {emoji && <span className="text-base">{emoji}</span>}
          <span className="text-sm font-semibold text-text">{title}</span>
        </div>
        <ChevronIcon expanded={open} />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line p-4 space-y-5">{children}</div>
        </div>
      </div>
    </Card>
  );
}

export interface SettingsSubGroupProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SettingsSubGroup({
  title,
  children,
  defaultOpen = false,
}: SettingsSubGroupProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left group mb-1"
      >
        <ChevronIcon expanded={open} />
        {/* eslint-disable-next-line sergeant-design/no-eyebrow-drift --
            Collapsible header uses `group-hover:text-text` interactive state +
            transition-colors, which SectionHeading can't express via its
            static tone tokens. */}
        <span className="text-xs font-bold text-muted uppercase tracking-widest group-hover:text-text transition-colors">
          {title}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-2 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

export interface ToggleRowProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-text">{label}</span>
        {description && (
          <p className="text-xs text-subtle mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <Switch checked={checked} onChange={onChange} />
      </div>
    </label>
  );
}

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(open, panelRef, { onEscape: onCancel });

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Закрити"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-sm bg-panel border border-line rounded-2xl shadow-soft p-5 z-10"
      >
        <h2 id="confirm-modal-title" className="text-base font-bold text-text">
          {title}
        </h2>
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
