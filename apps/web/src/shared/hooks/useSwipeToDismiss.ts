import { useCallback, useRef, type RefObject } from "react";

/**
 * Adds swipe-down-to-dismiss gesture to a bottom sheet panel.
 *
 * Tracks vertical touch movement on the panel. When the user drags down
 * past `threshold` px and releases, `onDismiss` fires. During the drag
 * the panel translates 1 : 1 with the finger via inline `transform`.
 *
 * Only activates when the touch starts inside the "handle zone" (top
 * 48 px of the panel — where the drag-handle pill lives) OR when the
 * scroll container is already at `scrollTop === 0`. This avoids
 * hijacking vertical scroll inside the sheet body.
 *
 * The hook returns touch handlers to spread onto the panel element.
 * It does NOT attach global listeners — callers keep full control.
 */

const HANDLE_ZONE_PX = 48;
const DEFAULT_THRESHOLD = 80;

export interface UseSwipeToDismissOptions {
  /** Called when the swipe exceeds the threshold. */
  onDismiss: () => void;
  /** Minimum downward drag distance to trigger dismiss (default 80). */
  threshold?: number;
  /** Ref to the panel element — used for inline transform during drag. */
  panelRef: RefObject<HTMLElement | null>;
  /** When true, the gesture is disabled (e.g. keyboard is open). */
  disabled?: boolean;
}

export function useSwipeToDismiss({
  onDismiss,
  threshold = DEFAULT_THRESHOLD,
  panelRef,
  disabled = false,
}: UseSwipeToDismissOptions) {
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const panel = panelRef.current;
      if (!panel) return;

      const touch = e.touches[0];
      const rect = panel.getBoundingClientRect();
      const relativeY = touch.clientY - rect.top;

      // Allow swipe start only in the handle zone (top area) or when
      // the body scroll container is already at the top.
      const scrollBody = panel.querySelector("[data-sheet-body]");
      const atScrollTop = !scrollBody || scrollBody.scrollTop <= 0;

      if (relativeY <= HANDLE_ZONE_PX || atScrollTop) {
        startY.current = touch.clientY;
        dragging.current = false;
      }
    },
    [disabled, panelRef],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || startY.current === null) return;
      const panel = panelRef.current;
      if (!panel) return;

      const dy = e.touches[0].clientY - startY.current;

      // Only drag downward
      if (dy <= 0) {
        panel.style.transform = "";
        dragging.current = false;
        return;
      }

      dragging.current = true;
      // 1:1 tracking with slight resistance past threshold
      const clamped = dy > threshold ? threshold + (dy - threshold) * 0.4 : dy;
      panel.style.transform = `translateY(${clamped}px)`;
      panel.style.transition = "none";
    },
    [disabled, panelRef, threshold],
  );

  const onTouchEnd = useCallback(() => {
    if (startY.current === null) return;
    const panel = panelRef.current;
    startY.current = null;

    if (!panel) return;

    if (dragging.current) {
      const currentY = parseFloat(
        panel.style.transform.replace(/[^0-9.-]/g, "") || "0",
      );
      if (currentY >= threshold) {
        // Animate out and dismiss
        panel.style.transition = "transform 150ms ease-out";
        panel.style.transform = "translateY(100%)";
        setTimeout(onDismiss, 150);
      } else {
        // Snap back
        panel.style.transition = "transform 200ms ease-out";
        panel.style.transform = "";
      }
    } else {
      panel.style.transform = "";
      panel.style.transition = "";
    }
    dragging.current = false;
  }, [panelRef, threshold, onDismiss]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
