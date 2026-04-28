/**
 * CelebrationModal — First entry success celebration
 *
 * Full-screen modal celebrating the user's first real entry.
 * Replaces the brief toast with a more memorable moment.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/components/ui/Button";
import { hapticTap } from "@shared/lib/haptic";

interface CelebrationModalProps {
  open: boolean;
  onClose: () => void;
  /** Time-to-value in milliseconds (null if not measured) */
  ttvMs: number | null;
}

export function CelebrationModal({
  open,
  onClose,
  ttvMs,
}: CelebrationModalProps) {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    hapticTap();
    setAnimateOut(true);
    setTimeout(() => {
      setVisible(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Sync visibility with open prop
  useEffect(() => {
    if (open) {
      setVisible(true);
      setAnimateOut(false);
    }
  }, [open]);

  // Auto-dismiss after 12 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      handleClose();
    }, 12000);
    return () => clearTimeout(timer);
  }, [visible, handleClose]);

  // Handle keyboard
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, handleClose]);

  // Focus the backdrop for keyboard accessibility
  useEffect(() => {
    if (visible && backdropRef.current) {
      backdropRef.current.focus();
    }
  }, [visible]);

  if (!visible) return null;

  // Build headline
  const headline =
    ttvMs != null && ttvMs < 60000
      ? `Готово за ${Math.max(1, Math.round(ttvMs / 1000))} с!`
      : "Готово!";

  return (
    <div
      ref={backdropRef}
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        "bg-bg/80 backdrop-blur-md",
        animateOut
          ? "motion-safe:animate-fade-out"
          : "motion-safe:animate-fade-in",
      )}
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClose();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Закрити святкування"
    >
      <div
        className={cn(
          "flex flex-col items-center gap-5 p-8 max-w-sm mx-4 text-center",
          animateOut
            ? "motion-safe:animate-scale-out"
            : "motion-safe:animate-scale-in",
        )}
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Success icon */}
        <div
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            "bg-brand-500/20 ring-4 ring-brand-500/30",
          )}
        >
          <svg
            className="w-10 h-10 text-brand-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline
              points="20 6 9 17 4 12"
              className="motion-safe:animate-draw-check"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 24,
              }}
            />
          </svg>
        </div>

        {/* Headline */}
        <h2 id="celebration-headline" className="text-h1 text-text">
          {headline}
        </h2>

        {/* Subtext */}
        <p className="text-body text-muted">
          Це вже твої дані. Sergeant працює для тебе.
        </p>

        {/* Dismiss button */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleClose}
          className="w-full max-w-[200px] mt-2"
        >
          Чудово!
        </Button>
      </div>
    </div>
  );
}
