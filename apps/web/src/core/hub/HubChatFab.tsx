import { Icon } from "@shared/components/ui/Icon";
import { cn } from "@shared/lib/cn";

/**
 * Floating action button shown when HubChat is minimized. Tapping it
 * restores the dialog without losing message state. The unseen-count
 * badge is driven by `HubChat`'s `onUnseenChange` callback (lifted to
 * `useHubUIState`) so the count survives across re-renders of the chat.
 */
export interface HubChatFabProps {
  onRestore: () => void;
  unseenCount?: number;
}

export function HubChatFab({ onRestore, unseenCount = 0 }: HubChatFabProps) {
  const hasBadge = unseenCount > 0;
  const badgeLabel = unseenCount > 9 ? "9+" : String(unseenCount);
  const ariaLabel = hasBadge
    ? `Відкрити асистента — ${unseenCount} нових повідомлень`
    : "Відкрити асистента";

  return (
    <button
      type="button"
      onClick={onRestore}
      aria-label={ariaLabel}
      className={cn(
        "fixed bottom-24 right-4 z-40",
        "w-14 h-14 rounded-2xl",
        "bg-brand-strong text-white shadow-float",
        "flex items-center justify-center",
        "transition-transform active:scale-95",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
        "motion-safe:animate-bounce-in",
      )}
    >
      <Icon name="sparkle" size={22} aria-hidden />
      {hasBadge && (
        <span
          className={cn(
            "absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5",
            "rounded-full bg-danger-strong text-white text-2xs font-bold",
            "flex items-center justify-center ring-2 ring-bg",
            "tabular-nums",
          )}
          aria-hidden
        >
          {badgeLabel}
        </span>
      )}
    </button>
  );
}
