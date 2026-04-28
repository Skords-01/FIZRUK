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
  position,
  delay = 500,
  showOnce,
  actionText = "Зрозуміло",
  onDismiss,
  skipPersist = false,
  children,
}: FeatureSpotlightProps) {
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const effectivePlacement = position ?? placement;
  const persistDismissal = showOnce ?? !skipPersist;

  // Check if already dismissed
  useEffect(() => {
    if (persistDismissal && isDismissed(id)) {
      return;
    }

    // Find target element and measure it
    const measureTarget = () => {
      const target = targetSelector
        ? document.querySelector(targetSelector)
        : targetRef.current;
      if (!target) return null;

      const rect = target.getBoundingClientRect();
      // Validate the rect is reasonable (element is in viewport)
      if (
        rect.width === 0 ||
        rect.height === 0 ||
        rect.top > window.innerHeight ||
        rect.bottom < 0 ||
        rect.left > window.innerWidth ||
        rect.right < 0
      ) {
        return null;
      }
      return rect;
    };

    const findTarget = () => {
      const rect = measureTarget();
      if (rect) {
        setTargetRect(rect);
        setVisible(true);
      }
    };

    // Delay slightly to ensure DOM is ready and layout is stable
    const timer = setTimeout(findTarget, delay);
    return () => clearTimeout(timer);
  }, [delay, id, persistDismissal, targetSelector]);

  // Update position on scroll/resize with debouncing
  useEffect(() => {
    if (!visible) return;

    let rafId: number | null = null;

    const updatePosition = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const target = targetSelector
          ? document.querySelector(targetSelector)
          : targetRef.current;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        // Validate the rect is reasonable (element is still in viewport)
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top < window.innerHeight &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.right > 0
        ) {
          setTargetRect(rect);
        }
      });
    };

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [visible, targetSelector]);

  const handleDismiss = useCallback(() => {
    hapticTap();
    setVisible(false);
    if (persistDismissal) {
      markDismissed(id);
    }
    onDismiss?.();
  }, [id, persistDismissal, onDismiss]);

  const target = children ? (
    <span ref={targetRef} className="inline-flex">
      {children}
    </span>
  ) : null;

  if (!visible || !targetRect) return target;

  // Calculate tooltip position with edge-clamping to prevent overflow
  const padding = 12;
  const tooltipWidth = 288; // w-72 = 18rem = 288px
  const edgeMargin = 16;
  const tooltipStyle: CSSProperties = {};

  switch (effectivePlacement) {
    case "top":
      tooltipStyle.bottom = window.innerHeight - targetRect.top + padding;
      tooltipStyle.left = Math.max(
        edgeMargin,
        Math.min(
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          window.innerWidth - tooltipWidth - edgeMargin,
        ),
      );
      break;
    case "bottom":
      tooltipStyle.top = targetRect.bottom + padding;
      tooltipStyle.left = Math.max(
        edgeMargin,
        Math.min(
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          window.innerWidth - tooltipWidth - edgeMargin,
        ),
      );
      break;
    case "left":
      // Position tooltip to the left of target, clamped to viewport
      tooltipStyle.right = window.innerWidth - targetRect.left + padding;
      tooltipStyle.top = Math.max(
        edgeMargin,
        Math.min(
          targetRect.top + targetRect.height / 2 - 60, // ~60px half-height estimate
          window.innerHeight - 140 - edgeMargin,
        ),
      );
      // Clamp right edge so tooltip doesn't go off-screen left
      if (tooltipStyle.right > window.innerWidth - tooltipWidth - edgeMargin) {
        // Flip to bottom placement instead
        delete tooltipStyle.right;
        tooltipStyle.top = targetRect.bottom + padding;
        tooltipStyle.left = Math.max(
          edgeMargin,
          Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - edgeMargin,
          ),
        );
      }
      break;
    case "right":
      tooltipStyle.left = targetRect.right + padding;
      tooltipStyle.top = Math.max(
        edgeMargin,
        Math.min(
          targetRect.top + targetRect.height / 2 - 60,
          window.innerHeight - 140 - edgeMargin,
        ),
      );
      // Clamp left edge so tooltip doesn't go off-screen right
      if (tooltipStyle.left > window.innerWidth - tooltipWidth - edgeMargin) {
        // Flip to bottom placement instead
        tooltipStyle.left = Math.max(
          edgeMargin,
          Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - edgeMargin,
          ),
        );
        tooltipStyle.top = targetRect.bottom + padding;
      }
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
    <>
      {target}
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

        {/* Tooltip — pointer-events-auto ensures button is clickable */}
        <div
          ref={tooltipRef}
          className={cn(
            "fixed w-72 p-4 rounded-2xl pointer-events-auto",
            "bg-panel border border-line shadow-float",
            "motion-safe:animate-slide-up",
          )}
          style={tooltipStyle}
        >
          <h3 className="text-base font-bold text-text mb-1">{title}</h3>
          <p className="text-sm text-muted mb-4">{description}</p>
          <Button size="sm" onClick={handleDismiss} className="w-full">
            {actionText}
          </Button>
        </div>
      </div>
    </>
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
