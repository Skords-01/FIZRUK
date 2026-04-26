import { Icon, type IconName } from "@shared/components/ui/Icon";
import { cn } from "@shared/lib/cn";

/**
 * Single-row stacked bar that visualises the assets vs. liabilities split
 * inside the Networth header. Only rendered when the user has at least
 * one of each bucket — a lone bar would be misleading.
 */
export function AssetsLiabilitiesBar({
  assets,
  liabilities,
}: {
  assets: number;
  liabilities: number;
}) {
  const total = assets + liabilities;
  if (total <= 0) return null;
  const assetsPct = Math.round((assets / total) * 100);
  const liabilitiesPct = 100 - assetsPct;
  return (
    <div className="mt-3">
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`Активи ${assetsPct}% · Пасиви ${liabilitiesPct}%`}
      >
        <div className="bg-emerald-300/90" style={{ width: `${assetsPct}%` }} />
        <div
          className="bg-rose-400/80"
          style={{ width: `${liabilitiesPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-emerald-100/80 mt-1.5">
        <span>Активи {assetsPct}%</span>
        <span>Пасиви {liabilitiesPct}%</span>
      </div>
    </div>
  );
}

/**
 * Dashed-border CTA used in the 3-button quick-action row above the
 * sections. Each button collapses the "expand → scroll → tap +" flow
 * into a single tap that opens the relevant section *and* reveals its
 * inline form.
 */
export function QuickActionButton({
  iconName,
  label,
  onClick,
}: {
  iconName: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs text-muted border border-dashed border-line rounded-2xl hover:border-primary hover:text-primary transition-colors"
    >
      <Icon name={iconName} size={18} />
      <span className="font-medium">+ {label}</span>
    </button>
  );
}

export type SectionBarProps = {
  title: string;
  iconName: IconName;
  iconTone?: "success" | "danger" | "muted";
  summary?: string | null;
  open: boolean;
  onToggle: () => void;
};

/**
 * Collapsible section header used for Subscriptions / Assets / Liabilities
 * blocks. The trailing label switches between "Розкласти ↓" / "Згорнути ↑"
 * to make the affordance unambiguous on mobile.
 */
export function SectionBar({
  title,
  iconName,
  iconTone = "muted",
  summary,
  open,
  onToggle,
}: SectionBarProps) {
  const toneClass =
    iconTone === "success"
      ? "text-success"
      : iconTone === "danger"
        ? "text-danger"
        : "text-muted";
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-panelHi border border-line rounded-2xl mb-2 text-left transition-colors hover:border-muted/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn(
            "inline-flex items-center justify-center shrink-0",
            toneClass,
          )}
          aria-hidden
        >
          <Icon name={iconName} size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-text truncate">{title}</div>
          {summary && (
            <div className="text-xs text-muted mt-0.5 truncate">{summary}</div>
          )}
        </div>
      </div>
      <span className="text-xs text-muted shrink-0 ml-2">
        {open ? "Згорнути ↑" : "Розкласти ↓"}
      </span>
    </button>
  );
}
