import { useState } from "react";
import { cn } from "@shared/lib/cn";

export function ChevronIcon({ expanded }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "transition-transform duration-200 shrink-0",
        expanded && "rotate-90",
      )}
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function SettingsGroup({ title, emoji, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line bg-panel shadow-card overflow-hidden">
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
          <div className="border-t border-line/60 p-4 space-y-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsSubGroup({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left group mb-1"
      >
        <ChevronIcon expanded={open} />
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

export function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-text">{label}</span>
        {description && (
          <p className="text-[11px] text-subtle mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <input
          type="checkbox"
          className="w-5 h-5 accent-primary cursor-pointer"
          checked={checked}
          onChange={onChange}
        />
      </div>
    </label>
  );
}
