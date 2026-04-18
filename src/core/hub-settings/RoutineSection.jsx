import { useCallback, useEffect, useState } from "react";
import {
  loadRoutineState,
  setPref,
} from "../../modules/routine/lib/routineStorage.js";
import { SettingsGroup, ToggleRow } from "./SettingsPrimitives.jsx";

export function RoutineSection() {
  const [routine, setRoutine] = useState(() => loadRoutineState());

  useEffect(() => {
    const handler = () => setRoutine(loadRoutineState());
    const storageHandler = (e) => {
      if (e.key === "hub_routine_v1" || e.key === null) handler();
    };
    window.addEventListener("hub-routine-storage", handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("hub-routine-storage", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const updatePref = useCallback((key, value) => {
    setRoutine((s) => setPref(s, key, value));
  }, []);

  return (
    <SettingsGroup title="Рутина" emoji="✅">
      <ToggleRow
        label="Показувати тренування з Фізрука в календарі"
        checked={routine.prefs?.showFizrukInCalendar !== false}
        onChange={(e) => updatePref("showFizrukInCalendar", e.target.checked)}
      />
      <ToggleRow
        label="Показувати планові платежі підписок Фініка в календарі"
        checked={routine.prefs?.showFinykSubscriptionsInCalendar !== false}
        onChange={(e) =>
          updatePref("showFinykSubscriptionsInCalendar", e.target.checked)
        }
      />
    </SettingsGroup>
  );
}
