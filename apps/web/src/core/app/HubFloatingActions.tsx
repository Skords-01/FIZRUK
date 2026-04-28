import { Icon } from "@shared/components/ui/Icon";
import { FeatureSpotlight } from "@shared/components/ui/FeatureSpotlight";
import { cn } from "@shared/lib/cn";

/**
 * Thumb-reach entry point to the AI assistant. A single FAB that opens
 * the hub chat — the primary add surface is `TodayFocusCard`
 * (`+ Витрата / + Їжа / + Звичка / + Тренування` chips), which already
 * covers every module's quick-add path and made the previous
 * add-speed-dial FAB a pure duplicate.
 *
 * This is the only chat entry point in the hub chrome; the header no
 * longer duplicates the action next to search/dark-mode.
 *
 * @param {object} props
 * @param {boolean} [props.hidden=false] - When true the FAB is not
 *   rendered at all. Used during the FTUX session so the only
 *   interactive surface in view is `FirstActionHeroCard` → `PresetSheet`
 *   (the one-tap "real entry" path). A chat FAB would otherwise pull
 *   users into a conversational flow before they've logged anything.
 * @param {() => void} props.onOpenChat - Opens the hub AI chat panel
 *   (resolves to `ui.openChat()`).
 * @param {boolean} [props.compact=false] - When true, renders a small
 *   circular icon-only FAB instead of the full pill. Used in module
 *   views to minimize screen real estate usage while still providing
 *   quick access to the assistant.
 */
export function HubFloatingActions({
  hidden = false,
  onOpenChat,
  compact = false,
}) {
  if (hidden || !onOpenChat) return null;

  // Compact mode positions FAB above bottom nav; full mode uses safe-area only
  const bottomOffset = compact
    ? "calc(76px + env(safe-area-inset-bottom, 0px))"
    : "calc(1.25rem + env(safe-area-inset-bottom, 0px))";

  // Compact: small circular icon button; Full: pill with icon + label
  const fabButton = (
    <button
      type="button"
      onClick={() => onOpenChat()}
      aria-label="Відкрити AI-асистента"
      title="Асистент"
      className={cn(
        "pointer-events-auto flex items-center justify-center rounded-full",
        // brand-700 (not brand-500) — needed for WCAG AA contrast against
        // `text-white` at 14px regular weight (≥4.5:1).
        "bg-brand-700 text-white shadow-float",
        "hover:bg-brand-800 hover:shadow-glow active:scale-95 transition-[background-color,box-shadow,opacity,transform]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        compact ? "h-12 w-12" : "h-14 pl-4 pr-5 gap-2",
      )}
    >
      <Icon name="sparkle" size={compact ? 20 : 22} strokeWidth={2.2} />
      {!compact && (
        <span className="text-sm font-semibold whitespace-nowrap">
          Асистент
        </span>
      )}
    </button>
  );

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col items-end gap-2 pointer-events-none",
        compact ? "right-4" : "right-5",
      )}
      style={{ bottom: bottomOffset }}
    >
      {compact ? (
        fabButton
      ) : (
        <FeatureSpotlight
          id="hub-assistant-fab"
          title="AI-асистент"
          description="Запитай будь-що про фінанси, тренування, харчування чи рутину"
          placement="left"
          showOnce
          delay={3000}
        >
          {fabButton}
        </FeatureSpotlight>
      )}
    </div>
  );
}
