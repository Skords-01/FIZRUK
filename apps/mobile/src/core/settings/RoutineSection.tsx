/**
 * Sergeant Hub-core — RoutineSection (React Native, first cut)
 *
 * Mobile mirror of `apps/web/src/core/settings/RoutineSection.tsx`.
 *
 * Web drives these two toggles through `useRoutineState()` which pulls
 * from the full Routine module store. That store is not yet ported to
 * `apps/mobile`, so for the first cut we persist the prefs locally via
 * the MMKV-backed `useLocalStorage` hook under the same storage key the
 * web module uses for its user-prefs slice. Once `@sergeant/routine`
 * (or an equivalent shared store) lands on mobile, this section will
 * be rewired without API changes.
 *
 * Keys mirror the web `routine.prefs` slice so cloud-synced preferences
 * stay in one place across platforms; see
 * `apps/web/src/modules/routine/hooks/useRoutineState.js`.
 */

import { useLocalStorage } from "@/lib/storage";

import { SettingsGroup, ToggleRow } from "./SettingsPrimitives";

interface RoutinePrefs {
  showFizrukInCalendar?: boolean;
  showFinykSubscriptionsInCalendar?: boolean;
}

// TODO(mobile-migration): swap for the canonical routine-module storage
// key once the module lands in `apps/mobile`. The `@routine_prefs_v1`
// shape deliberately mirrors the relevant slice of the web
// `routine.prefs` payload so cloud-sync and future `useRoutineState`
// wiring stay drop-in.
const PREFS_KEY = "@routine_prefs_v1";

export function RoutineSection() {
  const [prefs, setPrefs] = useLocalStorage<RoutinePrefs>(PREFS_KEY, {});

  const showFizruk = prefs.showFizrukInCalendar !== false;
  const showFinyk = prefs.showFinykSubscriptionsInCalendar !== false;

  return (
    <SettingsGroup title="Рутина" emoji="✅">
      <ToggleRow
        label="Показувати тренування з Фізрука в календарі"
        checked={showFizruk}
        onChange={(next) =>
          setPrefs((prev) => ({ ...prev, showFizrukInCalendar: next }))
        }
      />
      <ToggleRow
        label="Показувати планові платежі підписок Фініка в календарі"
        checked={showFinyk}
        onChange={(next) =>
          setPrefs((prev) => ({
            ...prev,
            showFinykSubscriptionsInCalendar: next,
          }))
        }
      />
    </SettingsGroup>
  );
}
