import { forwardRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Sergeant Design System — Input Component
 *
 * Sizes: sm, md, lg
 * Variants: default, filled, ghost
 * States: error, success
 */

const sizes = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-4 text-base rounded-2xl",
  lg: "h-12 px-5 text-base rounded-2xl",
};

const variants = {
  default:
    "bg-panelHi border border-line focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
  filled: "bg-panelHi border-transparent focus:bg-panel focus:border-brand-400",
  ghost: "bg-transparent border-transparent hover:bg-panelHi focus:bg-panelHi",
};

export const Input = forwardRef(function Input(
  {
    className,
    size = "md",
    variant = "default",
    error,
    success,
    icon,
    suffix,
    ...props
  },
  ref,
) {
  const stateClass = error
    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
    : success
      ? "border-brand-400 focus:border-brand-500 focus:ring-brand-100"
      : "";

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full text-text placeholder:text-subtle/70",
          "outline-none transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          sizes[size],
          variants[variant],
          stateClass,
          icon && "pl-10",
          suffix && "pr-10",
          className,
        )}
        {...props}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          {suffix}
        </div>
      )}
    </div>
  );
});

/**
 * Textarea — Multi-line text input
 */
export const Textarea = forwardRef(function Textarea(
  { className, variant = "default", error, rows = 3, ...props },
  ref,
) {
  const stateClass = error
    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
    : "";

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full px-4 py-3 text-base text-text placeholder:text-subtle/70 rounded-2xl",
        "outline-none transition-all duration-200 resize-none",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        stateClass,
        className,
      )}
      {...props}
    />
  );
});

/**
 * InputGroup — Input with label and helper text
 */
export function InputGroup({
  label,
  helper,
  error,
  required,
  className,
  children,
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {(helper || error) && (
        <p className={cn("text-xs", error ? "text-red-500" : "text-muted")}>
          {error || helper}
        </p>
      )}
    </div>
  );
}

/**
 * SearchInput — Input styled for search with icon
 */
export const SearchInput = forwardRef(function SearchInput(
  { className, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="search"
      placeholder="Пошук..."
      icon={
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      }
      className={className}
      {...props}
    />
  );
});
