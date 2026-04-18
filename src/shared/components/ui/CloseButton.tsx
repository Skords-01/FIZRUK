import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { cn } from "../../lib/cn";

/**
 * CloseButton — canonical "×" dismiss control for sheets, dialogs, and toasts.
 *
 * Replaces the 9+ hand-rolled close-button shapes that drifted across the app.
 * Under the hood it's just `<Button variant="ghost" iconOnly size="sm">` with
 * the close glyph baked in, plus a single `onDark` escape hatch for dark hero
 * surfaces (white text on tinted background).
 */

export type CloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  /** Accessible label (defaults to Ukrainian "Close"). */
  label?: string;
  /** Render with white-on-dark palette for placement on coloured hero cards. */
  onDark?: boolean;
  /** Button size — sm (default) renders a 36×36 target, md renders 44×44. */
  size?: "sm" | "md";
};

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(
  function CloseButton(
    { className, label = "Закрити", onDark = false, size = "sm", ...props },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size={size}
        iconOnly
        aria-label={label}
        className={cn(
          "shrink-0",
          onDark &&
            "text-white/80 hover:bg-white/15 hover:text-white focus-visible:ring-white/40 focus-visible:ring-offset-0",
          className,
        )}
        {...props}
      >
        <Icon name="close" size={size === "md" ? 20 : 18} />
      </Button>
    );
  },
);
