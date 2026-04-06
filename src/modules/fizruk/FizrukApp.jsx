import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Workouts } from "./pages/Workouts";
import { Progress } from "./pages/Progress";
import { cn } from "@shared/lib/cn";

const NAV = [
  {
    id: "dashboard", label: "Сьогодні",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    id: "workouts", label: "Тренування",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3"/></svg>,
  },
  {
    id: "progress", label: "Прогрес",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
];

export default function FizrukApp() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="h-dvh flex flex-col bg-bg text-text overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-panel/95 backdrop-blur-md border-b border-line/60 z-20" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex h-14 items-center px-5 pl-14">
          <span className="text-[16px] font-semibold tracking-wide text-text">ФІЗРУК</span>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {page === "dashboard" && <Dashboard />}
        {page === "workouts"  && <Workouts />}
        {page === "progress"  && <Progress />}
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 bg-panel/95 backdrop-blur-md border-t border-line/60" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex h-[58px]">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn("flex-1 flex flex-col items-center justify-center gap-1 transition-all", page === item.id ? "text-text" : "text-muted")}
            >
              {item.icon}
              <span className={cn("text-[11px] leading-none font-semibold", page === item.id ? "text-text" : "text-muted")}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
