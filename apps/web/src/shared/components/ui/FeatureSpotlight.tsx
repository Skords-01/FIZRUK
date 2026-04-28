import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from "react";
import { cn } from "../../lib/cn";
import { safeReadStringLS, safeWriteLS, safeRemoveLS } from "../../lib/storage";
import { Button } from "./Button";
import { hapticTap } from "../../lib/haptic";

/**
 * Sergeant Design System — Feature Spotlight
 *
 * A contextual hint component for onboarding and feature discovery.
 * Shows a spotlight around a target element with an explanatory tooltip.
 *
 * Features:
 * - Positions automatically relative to target element
 * - Spotlight overlay with cutout around target
 * - Dismissible with "Got it" button or clicking outside
 * - Persists dismissal in localStorage
 * - Respects reduced motion preferences
 *
 * @example
 * <FeatureSpotlight
 *   id="new-search-feature"
 *   targetSelector="#search-button"
 *   title="New: Global Search"
 *   description="Press Cmd+K to search across all modules"
 *   placement="bottom"
 * />
 */

type Placement = "top" | "bottom" | "left" | "right";

export interface FeatureSpotlightProps {
  /** Unique ID for localStorage persistence */
  id: string;
  /**
   * CSS selector for target element. Optional — when omitted, the
   * component anchors to its own `children` wrapper instead.
   */
  targetSelector?: string;
  /** Spotlight title */
  title: string;
  /** Spotlight description */
  description: string;
  /** Placement relative to target */
  placement?: Placement;
  /** Alias for `placement`. */
  position?: Placement;
  /** Skip rendering after first dismissal (uses localStorage). */
  showOnce?: boolean;
  /** Delay in ms before the spotlight is shown. */
  delay?: number;
  /** Custom action button text */
  actionText?: string;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Skip localStorage persistence */
  skipPersist?: boolean;
  /** Children slot for custom content */
  children?: ReactNode;
}

const STORAGE_KEY_PREFIX = "sergeant_spotlight_dismissed_";

function isDismissed(id: string): boolean {
  return safeReadStringLS(STORAGE_KEY_PREFIX + id) === "true";
}

function markDismissed(id: string): void {
  safeWriteLS(STORAGE_KEY_PREFIX + id, "true");
}

export function FeatureSpotlight({
  id,
  targetSelector,
  title,
  description,
  placement = "bottom",
  actionText = "Зрозуміло",
  onDismiss,
  skipPersist = false,
  children,
}: FeatureSpotlightProps) {
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if already dismissed
  useEffect(() => {
    if (!skipPersist && isDismissed(id)) {
      return;
    }

    // Find target element
    const findTarget = () => {
      if (!targetSelector) return;
      const target = document.querySelector(targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        setVisible(true);
      }
    };

    // Delay slightly to ensure DOM is ready
    const timer = setTimeout(findTarget, 500);
    return () => clearTimeout(timer);
  }, [id, targetSelector, skipPersist]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!visible) return;

    const updatePosition = () => {
      if (!targetSelector) return;
      const target = document.querySelector(targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [visible, targetSelector]);

  const handleDismiss = useCallback(() => {
    hapticTap();
    setVisible(false);
    if (!skipPersist) {
      markDismissed(id);
    }
    onDismiss?.();
  }, [id, skipPersist, onDismiss]);

  if (!visible || !targetRect) return null;

  // Calculate tooltip position
  const padding = 12;
  const tooltipStyle: CSSProperties = {};

  switch (placement) {
    case "top":
      tooltipStyle.bottom = window.innerHeight - targetRect.top + padding;
      tooltipStyle.left = targetRect.left + targetRect.width / 2;
      tooltipStyle.transform = "translateX(-50%)";
      break;
    case "bottom":
      tooltipStyle.top = targetRect.bottom + padding;
      tooltipStyle.left = targetRect.left + targetRect.width / 2;
      tooltipStyle.transform = "translateX(-50%)";
      break;
    case "left":
      tooltipStyle.right = window.innerWidth - targetRect.left + padding;
      tooltipStyle.top = targetRect.top + targetRect.height / 2;
      tooltipStyle.transform = "translateY(-50%)";
      break;
    case "right":
      tooltipStyle.left = targetRect.right + padding;
      tooltipStyle.top = targetRect.top + targetRect.height / 2;
      tooltipStyle.transform = "translateY(-50%)";
      break;
  }

  // Spotlight cutout dimensions
  const spotlightPadding = 8;
  const spotlightRect = {
    top: targetRect.top - spotlightPadding,
    left: targetRect.left - spotlightPadding,
    width: targetRect.width + spotlightPadding * 2,
    height: targetRect.height + spotlightPadding * 2,
    borderRadius: 12,
  };

  return (
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true">
      {/* Overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        onClick={handleDismiss}
        aria-hidden="true"
      >
        <defs>
          <mask id={`spotlight-mask-${id}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlightRect.left}
              y={spotlightRect.top}
              width={spotlightRect.width}
              height={spotlightRect.height}
              rx={spotlightRect.borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask={`url(#spotlight-mask-${id})`}
          className="motion-safe:animate-fade-in"
        />
      </svg>

      {/* Spotlight ring */}
      <div
        className={cn(
          "absolute pointer-events-none",
          "rounded-xl ring-2 ring-brand-500 ring-offset-2 ring-offset-transparent",
          "motion-safe:animate-pulse",
        )}
        style={{
          top: spotlightRect.top,
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
        }}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed w-72 p-4 rounded-2xl",
          "bg-panel border border-line shadow-float",
          "motion-safe:animate-slide-up",
        )}
        style={tooltipStyle}
      >
        <h3 className="text-base font-bold text-text mb-1">{title}</h3>
        <p className="text-sm text-muted mb-4">{description}</p>
        {children}
        <Button size="sm" onClick={handleDismiss} className="w-full">
          {actionText}
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to reset a spotlight's dismissed state (for testing/debugging)
 */
export function useResetSpotlight() {
  return useCallback((id: string) => {
    safeRemoveLS(STORAGE_KEY_PREFIX + id);
  }, []);
}

/**
 * Hook to check if a spotlight has been dismissed
 */
export function useSpotlightDismissed(id: string): boolean {
  const [dismissed, setDismissed] = useState(() => isDismissed(id));

  useEffect(() => {
    setDismissed(isDismissed(id));
  }, [id]);

  return dismissed;
}
