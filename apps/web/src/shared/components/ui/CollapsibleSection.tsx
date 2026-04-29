import { useState, useCallback, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "./Icon";
import { SectionHeading, type SectionHeadingSize } from "./SectionHeading";
import { safeReadLS, safeWriteLS } from "../../lib/storage";

export interface CollapsibleSectionProps {
  /** Unique key for persisting collapse state in localStorage. */
  storageKey: string;
  /** Section heading text. */
  title: ReactNode;
  /** Default state when no localStorage value exists. */
  defaultOpen?: boolean;
  /** SectionHeading size — defaults to "xs". */
  headingSize?: SectionHeadingSize;
  children?: ReactNode;
  className?: string;
}

/**
 * Section wrapper that collapses/expands its children and persists the
 * state in localStorage. Used on HubDashboard to let users collapse
 * the "Підказки" and "Аналітика" sections to reduce scroll depth.
 *
 * The heading row doubles as the toggle button (chevron + heading).
 * Collapse animation uses CSS `grid-template-rows` for smooth height
 * transitions (no JavaScript measurement needed).
 */
export function CollapsibleSection({
  storageKey,
  title,
  defaultOpen = true,
  headingSize = "xs",
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState<boolean>(
    () => safeReadLS<boolean>(storageKey, defaultOpen) ?? defaultOpen,
  );

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      safeWriteLS(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return (
    <section className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center gap-1.5 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg -ml-0.5 pl-0.5"
      >
        <Icon
          name="chevron-right"
          size={12}
          strokeWidth={2.5}
          className={cn(
            "text-subtle transition-transform duration-200",
            open && "rotate-90",
          )}
          aria-hidden
        />
        <SectionHeading as="span" size={headingSize} className="!px-0">
          {title}
        </SectionHeading>
      </button>

      {/* CSS grid row transition for smooth collapse */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2">{children}</div>
        </div>
      </div>
    </section>
  );
}
