import { cn } from "@shared/lib/cn";

export interface SyncTone {
  dot: string;
  text: string;
}

export interface FinykHeaderProps {
  syncTone: SyncTone;
  showBalance: boolean;
  onToggleBalance: () => void;
}

function FinykWalletBadge() {
  return (
    <div
      className="shrink-0 w-9 h-9 rounded-xl bg-emerald-500/12 flex items-center justify-center text-emerald-600 border border-emerald-500/15"
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/**
 * Top bar for Finyk's main view. The primary app header differs enough
 * from ModuleHeader's title/subtitle/back idiom — no back button, a sync
 * status dot, and a show-balance toggle — that it stays module-specific
 * instead of squeezing into ModuleHeader's slots.
 */
export function FinykHeader({
  syncTone,
  showBalance,
  onToggleBalance,
}: FinykHeaderProps) {
  return (
    <div className="shrink-0 bg-panel/95 backdrop-blur-md border-b border-line z-40 relative safe-area-pt">
      <div className="flex h-14 items-center justify-between px-4 sm:px-5 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FinykWalletBadge />
          <div className="min-w-0">
            <span className="text-[16px] font-semibold tracking-wide text-text block leading-tight">
              ФІНІК
            </span>
            <span className="text-2xs text-subtle font-medium hidden sm:block truncate">
              Monobank · бюджети
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-subtle select-none">
            <span className={cn("w-2 h-2 rounded-full", syncTone.dot)} />
            <span className="hidden sm:inline">{syncTone.text}</span>
          </div>
          <button
            type="button"
            onClick={onToggleBalance}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-subtle hover:text-text hover:bg-panelHi transition-colors"
            aria-label={showBalance ? "Приховати суми" : "Показати суми"}
            title={showBalance ? "Приховати суми" : "Показати суми"}
          >
            {showBalance ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
