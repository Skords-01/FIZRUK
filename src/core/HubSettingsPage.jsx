import { GeneralSection } from "./hub-settings/GeneralSection.jsx";
import { AIDigestSection } from "./hub-settings/AIDigestSection.jsx";
import { NotificationsSection } from "./hub-settings/NotificationsSection.jsx";
import { RoutineSection } from "./hub-settings/RoutineSection.jsx";
import { FizrukSection } from "./hub-settings/FizrukSection.jsx";
import { FinykSection } from "./hub-settings/FinykSection.jsx";

export function HubSettingsPage({
  dark,
  onToggleDark,
  syncing,
  onSync,
  onPull,
  user,
}) {
  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      <GeneralSection
        dark={dark}
        onToggleDark={onToggleDark}
        syncing={syncing}
        onSync={onSync}
        onPull={onPull}
        user={user}
      />
      <AIDigestSection />
      <NotificationsSection />
      <RoutineSection />
      <FizrukSection />
      <FinykSection />
    </div>
  );
}
