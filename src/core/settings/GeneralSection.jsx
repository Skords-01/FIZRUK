import { useState } from "react";
import { Button } from "@shared/components/ui/Button";
import { HubBackupPanel } from "../HubBackupPanel.jsx";
import { resetDashboardOrder } from "../HubDashboard.jsx";
import {
  SettingsGroup,
  SettingsSubGroup,
  ToggleRow,
} from "./SettingsPrimitives.jsx";
import { loadHubPrefs, saveHubPref } from "./hubPrefs.js";

export function GeneralSection({
  dark,
  onToggleDark,
  syncing,
  onSync,
  onPull,
  user,
}) {
  const [orderReset, setOrderReset] = useState(false);
  const [showCoach, setShowCoach] = useState(
    () => loadHubPrefs().showCoach !== false,
  );

  const handleResetOrder = () => {
    resetDashboardOrder();
    setOrderReset(true);
    setTimeout(() => setOrderReset(false), 2000);
  };

  const handleToggleCoach = (e) => {
    const val = e.target.checked;
    setShowCoach(val);
    saveHubPref("showCoach", val);
  };

  return (
    <SettingsGroup title="Загальні" emoji="⚙️">
      <ToggleRow label="Темна тема" checked={dark} onChange={onToggleDark} />
      <SettingsSubGroup title="Дашборд">
        <ToggleRow
          label="Показувати AI-коуч"
          description="Блок з щоденною порадою коуча на головному екрані."
          checked={showCoach}
          onChange={handleToggleCoach}
        />
      </SettingsSubGroup>
      <SettingsSubGroup title="Дашборд — порядок блоків">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-full"
          onClick={handleResetOrder}
          disabled={orderReset}
        >
          {orderReset ? "✓ Порядок скинуто" : "🔄 Скинути порядок блоків"}
        </Button>
      </SettingsSubGroup>
      {user && (
        <SettingsSubGroup title="Хмарна синхронізація">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 flex-1"
              disabled={syncing}
              onClick={onSync}
            >
              {syncing ? "Зберігаємо…" : "Зберегти в хмару"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 flex-1"
              disabled={syncing}
              onClick={onPull}
            >
              {syncing ? "Завантаження…" : "Завантажити з хмари"}
            </Button>
          </div>
        </SettingsSubGroup>
      )}
      <SettingsSubGroup title="Резервна копія Hub" defaultOpen>
        <HubBackupPanel />
      </SettingsSubGroup>
    </SettingsGroup>
  );
}
