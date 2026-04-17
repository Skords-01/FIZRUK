import { createContext, useContext } from "react";

const RoutineCalendarContext = createContext(null);

export function RoutineCalendarProvider({ value, children }) {
  return (
    <RoutineCalendarContext.Provider value={value}>
      {children}
    </RoutineCalendarContext.Provider>
  );
}

export function useRoutineCalendar() {
  const ctx = useContext(RoutineCalendarContext);
  if (!ctx) throw new Error("useRoutineCalendar must be used within RoutineCalendarProvider");
  return ctx;
}

