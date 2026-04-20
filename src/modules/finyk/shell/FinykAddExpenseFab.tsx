export interface FinykAddExpenseFabProps {
  onClick: () => void;
}

/**
 * Floating "add expense" button anchored above the bottom nav. Only
 * visible on overview / transactions / budgets — other pages don't
 * benefit from the shortcut. Rendered as a shell overlay so it floats
 * above the scrollable page area without being clipped.
 */
export function FinykAddExpenseFab({ onClick }: FinykAddExpenseFabProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[calc(60px+env(safe-area-inset-bottom,0px)+16px)] right-4 w-12 h-12 rounded-full bg-finyk text-white shadow-float flex items-center justify-center text-2xl hover:bg-finyk-hover hover:shadow-glow hover:scale-105 active:scale-95 transition-all duration-200 ease-smooth z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finyk/45 focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
      aria-label="Додати витрату"
    >
      +
    </button>
  );
}
