import { createContext, useContext } from "react";

const RoutineCalendarDataContext = createContext(null);
const RoutineCalendarActionsContext = createContext(null);

export function RoutineCalendarProvider({ data, actions, children }) {
  return (
    <RoutineCalendarDataContext.Provider value={data}>
      <RoutineCalendarActionsContext.Provider value={actions}>
        {children}
      </RoutineCalendarActionsContext.Provider>
    </RoutineCalendarDataContext.Provider>
  );
}

export function useRoutineCalendarData() {
  const ctx = useContext(RoutineCalendarDataContext);
  if (!ctx)
    throw new Error(
      "useRoutineCalendarData must be used within RoutineCalendarProvider",
    );
  return ctx;
}

export function useRoutineCalendarActions() {
  const ctx = useContext(RoutineCalendarActionsContext);
  if (!ctx)
    throw new Error(
      "useRoutineCalendarActions must be used within RoutineCalendarProvider",
    );
  return ctx;
}
