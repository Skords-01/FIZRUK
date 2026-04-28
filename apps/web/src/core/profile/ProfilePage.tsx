import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/Button";
import { Icon } from "@shared/components/ui/Icon";
import { useOnlineStatus } from "@shared/hooks/useOnlineStatus";
import { useAuth } from "../auth/AuthContext";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { DangerZoneSection } from "./DangerZoneSection";
import { MemoryBankSection } from "./MemoryBankSection";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { SessionsSection } from "./SessionsSection";

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();
  const online = useOnlineStatus();

  if (!user) {
    return null;
  }

  return (
    <div
      className="min-h-dvh bg-bg"
      style={{
        paddingTop: "max(0px, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Top nav bar */}
      <div className="sticky top-0 z-10 bg-bg/80 backdrop-blur-md border-b border-line/60">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => navigate(-1)}
            aria-label="Назад"
          >
            <Icon name="chevron-left" size={20} />
          </Button>
          <span className="text-sm font-semibold text-text">Профіль</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pb-10 space-y-3 pt-6">
        {!online && (
          <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
            <Icon name="wifi-off" size={16} className="text-warning shrink-0" />
            <p className="text-sm text-warning font-medium">
              Ви офлайн — редагування профілю тимчасово недоступне
            </p>
          </div>
        )}

        <PersonalInfoSection user={user} online={online} onRefresh={refresh} />

        {/* Section label */}
        <p className="text-eyebrow text-muted/60 px-1 pt-2">Пам&apos;ять</p>
        <MemoryBankSection />

        <p className="text-eyebrow text-muted/60 px-1 pt-2">Безпека</p>
        <ChangePasswordSection online={online} />
        <SessionsSection online={online} />

        <p className="text-eyebrow text-muted/60 px-1 pt-2">Акаунт</p>
        <DangerZoneSection online={online} onLogout={logout} />
      </div>
    </div>
  );
}
