import { cn } from "@shared/lib/cn";
import type { ChangeEvent } from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * iOS-style pill toggle switch.
 *
 * - 44×26 px track satisfies the 44px minimum touch target.
 * - Uses a hidden `<input type="checkbox">` for form semantics and a11y.
 * - Thumb slides with a 200ms spring transition.
 *
 * Expects to be placed inside a `<label>` that already provides visible
 * accessible text (e.g. `ToggleRow`).
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span
        className={cn(
          "block w-[44px] h-[26px] rounded-full transition-colors duration-200",
          "bg-line peer-checked:bg-brand-500",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/45 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg",
        )}
      />
      <span
        className={cn(
          "absolute left-[3px] top-[3px] block w-5 h-5 rounded-full bg-panel shadow-card",
          "transition-transform duration-200",
          "peer-checked:translate-x-[18px]",
        )}
      />
    </span>
  );
}
