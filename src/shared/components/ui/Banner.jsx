import { cn } from "@shared/lib/cn";

const variants = {
  info: "border-line bg-panelHi/60 text-text",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function Banner({ variant = "info", className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        variants[variant] || variants.info,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
