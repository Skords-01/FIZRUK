import { useRef, type TouchEvent } from "react";

export interface UseSwipeTabsOptions {
  tabIds: readonly string[];
  activeId: string;
  onChange: (id: string) => void;
  /** Minimum horizontal travel before treating a touch as a swipe. */
  minDeltaX?: number;
  /** Horizontal delta must exceed vertical delta by this factor to
   *  avoid hijacking list scrolls. */
  directionalityRatio?: number;
}

export interface SwipeTabHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

/**
 * Produces touchStart/touchEnd handlers that advance/retreat a tab set
 * on horizontal swipes. Rejects gestures that are mostly vertical so
 * list scrolling inside a page isn't misread as a tab switch.
 */
export function useSwipeTabs({
  tabIds,
  activeId,
  onChange,
  minDeltaX = 60,
  directionalityRatio = 1.5,
}: UseSwipeTabsOptions): SwipeTabHandlers {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return {
    onTouchStart: (e) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e) => {
      if (startX.current === null || startY.current === null) return;
      const dx = startX.current - e.changedTouches[0].clientX;
      const dy = startY.current - e.changedTouches[0].clientY;
      startX.current = null;
      startY.current = null;

      if (Math.abs(dx) < minDeltaX) return;
      if (Math.abs(dx) < Math.abs(dy) * directionalityRatio) return;

      const curIdx = tabIds.indexOf(activeId);
      if (curIdx === -1) return;
      const next = curIdx + (dx > 0 ? 1 : -1);
      if (next >= 0 && next < tabIds.length) onChange(tabIds[next]);
    },
  };
}
