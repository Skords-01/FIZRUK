import { useState } from "react";
import { cn } from "@shared/lib/cn";

// Модулі — ліниво завантажуємо
import { lazy, Suspense } from "react";
const FinykApp  = lazy(() => import("../modules/finyk/FinykApp"));
const FizrukApp = lazy(() => import("../modules/fizruk/FizrukApp"));

const MODULES = [
  {
    id: "finyk",
    label: "ФІНІК",
    desc: "Фінанси",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    id: "fizruk",
    label: "ФІЗРУК",
    desc: "Спорт",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/><path d="M12 7v8m-4-5h8M9 20l3-5 3 5"/>
      </svg>
    ),
  },
];

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-subtle text-sm animate-pulse">Завантаження...</div>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState(null);

  // Головний екран — вибір модуля
  if (!activeModule) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <div className="text-2xl font-bold tracking-wide text-text mb-1">Мій простір</div>
          <div className="text-sm text-subtle">Обери модуль</div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className="bg-panel border border-line rounded-3xl p-6 flex flex-col items-center gap-3 shadow-card hover:shadow-float hover:border-muted/50 transition-all active:scale-95"
            >
              <span className="text-text opacity-70">{m.icon}</span>
              <div>
                <div className="text-sm font-bold text-text">{m.label}</div>
                <div className="text-xs text-subtle">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-bg text-text overflow-hidden">
      {/* Back to hub */}
      <div className="shrink-0 absolute top-0 left-0 z-50 p-2" style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}>
        <button
          onClick={() => setActiveModule(null)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-panel/80 backdrop-blur border border-line text-subtle hover:text-text transition-colors text-sm"
          title="До головного меню"
        >
          ⌂
        </button>
      </div>

      <Suspense fallback={<PageLoader />}>
        {activeModule === "finyk"  && <FinykApp />}
        {activeModule === "fizruk" && <FizrukApp />}
      </Suspense>
    </div>
  );
}
