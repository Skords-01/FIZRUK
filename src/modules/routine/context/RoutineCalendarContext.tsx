import { createContext, useContext, type ReactNode } from "react";

export type RoutineCalendarData = Record<string, unknown>;
export type RoutineCalendarActions = Record<string, unknown>;

const RoutineCalendarDataContext = createContext<RoutineCalendarData | null>(
  null,
);
const RoutineCalendarActionsContext =
  createContext<RoutineCalendarActions | null>(null);

export interface RoutineCalendarProviderProps {
  data: RoutineCalendarData;
  actions: RoutineCalendarActions;
  children: ReactNode;
}

export function RoutineCalendarProvider({
  data,
  actions,
  children,
}: RoutineCalendarProviderProps) {
  return (
    <RoutineCalendarDataContext.Provider value={data}>
      <RoutineCalendarActionsContext.Provider value={actions}>
        {children}
      </RoutineCalendarActionsContext.Provider>
    </RoutineCalendarDataContext.Provider>
  );
}

export function useRoutineCalendarData(): RoutineCalendarData {
  const ctx = useContext(RoutineCalendarDataContext);
  if (!ctx)
    throw new Error(
      "useRoutineCalendarData must be used within RoutineCalendarProvider",
    );
  return ctx;
}

export function useRoutineCalendarActions(): RoutineCalendarActions {
  const ctx = useContext(RoutineCalendarActionsContext);
  if (!ctx)
    throw new Error(
      "useRoutineCalendarActions must be used within RoutineCalendarProvider",
    );
  return ctx;
}
