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
import { useSpotlightQueue } from "./SpotlightQueue";

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
  /** Queue priority (higher = shows first) */
  priority?: number;
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
  priority = 0,
}: FeatureSpotlightProps) {
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const effectivePlacement = position ?? placement;
  const persistDismissal = showOnce ?? !skipPersist;

  // Queue integration — only one spotlight shows at a time
  const { requestSlot, releaseSlot, isMyTurn } = useSpotlightQueue();

  // Request queue slot on mount
  useEffect(() => {
    if (persistDismissal && isDismissed(id)) {
      return;
    }

    const newSlotId = requestSlot(id, priority);
    setSlotId(newSlotId);

    return () => {
      releaseSlot(newSlotId);
    };
  }, [id, persistDismissal, priority, requestSlot, releaseSlot]);

  // Show spotlight when it's our turn in the queue
  useEffect(() => {
    if (persistDismissal && isDismissed(id)) {
      return;
    }

    // Wait for our turn in the queue
    if (!isMyTurn(id)) {
      setVisible(false);
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
  }, [delay, id, persistDismissal, targetSelector, isMyTurn]);

  // Track viewport size for SVG viewBox updates - initialize after mount
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Initialize viewport size on mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setViewportSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

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

        // Update viewport size for SVG viewBox
        setViewportSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
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
    // Release queue slot so next spotlight can show
    if (slotId) {
      releaseSlot(slotId);
    }
    onDismiss?.();
  }, [id, persistDismissal, onDismiss, slotId, releaseSlot]);

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

  // Use a unique mask ID with a timestamp to avoid conflicts between spotlights
  const maskId = `spotlight-mask-${id}-${Date.now()}`;

  return (
    <>
      {target}
      {/* Portal to body ensures highest stacking context */}
      <div
        className="fixed inset-0 z-[9999] pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`spotlight-title-${id}`}
      >
        {/* Backdrop — intercepts clicks outside tooltip to dismiss */}
        <div
          className="absolute inset-0 pointer-events-auto"
          onClick={handleDismiss}
          aria-hidden="true"
        />

        {/* Overlay with cutout — use explicit dimensions for stable rendering */}
        {viewportSize.width > 0 && viewportSize.height > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={viewportSize.width}
            height={viewportSize.height}
            viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
            preserveAspectRatio="xMinYMin slice"
            aria-hidden="true"
          >
            <defs>
              <mask id={maskId}>
                <rect
                  x="0"
                  y="0"
                  width={viewportSize.width}
                  height={viewportSize.height}
                  fill="white"
                />
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
              width={viewportSize.width}
              height={viewportSize.height}
              fill="rgba(0, 0, 0, 0.6)"
              mask={`url(#${maskId})`}
              className="motion-safe:animate-fade-in"
            />
          </svg>
        )}

        {/* Spotlight ring — purely visual */}
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

        {/* Tooltip card — interactive, receives pointer events */}
        <div
          ref={tooltipRef}
          className={cn(
            "fixed w-72 p-4 rounded-2xl pointer-events-auto",
            "bg-panel border border-line shadow-float",
            "motion-safe:animate-slide-up",
          )}
          style={{ ...tooltipStyle, zIndex: 1 }}
        >
          <h3
            id={`spotlight-title-${id}`}
            className="text-base font-bold text-text mb-1"
          >
            {title}
          </h3>
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
