import { Button } from "@shared/components/ui/Button";
import { useToast } from "@shared/hooks/useToast";
import { webKVStore } from "@shared/lib/storage";
import { resetOnboardingState, type User } from "@sergeant/shared";
import { SettingsGroup, SettingsSubGroup } from "./SettingsPrimitives";

export interface GeneralSectionProps {
  syncing: boolean;
  onSync: () => void;
  onPull: () => void;
  user: User | null;
}

export function GeneralSection({
  syncing,
  onSync,
  onPull,
  user,
}: GeneralSectionProps) {
  const toast = useToast();

  return (
    <SettingsGroup title="Загальні" emoji="⚙️">
      <SettingsSubGroup title="Онбординг">
        <p className="text-xs text-subtle leading-snug">
          Перезапуск не видаляє твої дані — лише повертає вітальний екран та
          підказки першого запуску.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-full"
          onClick={() => {
            resetOnboardingState(webKVStore);
            toast.success("Онбординг перезапущено");
            try {
              window.location.assign("/welcome");
            } catch {
              /* noop */
            }
          }}
        >
          Перезапустити онбординг
        </Button>
      </SettingsSubGroup>
      {user && (
        <SettingsSubGroup title="Хмарна синхронізація" defaultOpen>
          <p className="text-xs text-subtle leading-snug">
            Основний спосіб зберегти дані — синхронізація з твоїм акаунтом.
            Покриває Фінік, Фізрук, Рутину та Харчування.
          </p>
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
    </SettingsGroup>
  );
}
