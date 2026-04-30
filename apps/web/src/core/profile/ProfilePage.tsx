import { useNavigate } from "react-router-dom";
import { Button } from "@shared/components/ui/Button";
import { CollapsibleSection } from "@shared/components/ui/CollapsibleSection";
import { Icon } from "@shared/components/ui/Icon";
import { useOnlineStatus } from "@shared/hooks/useOnlineStatus";
import { useAuth } from "../auth/AuthContext";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { DangerZoneSection } from "./DangerZoneSection";
import { MemoryBankSection } from "./MemoryBankSection";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { SessionsSection } from "./SessionsSection";

export interface ProfilePageProps {
  /**
   * Render the page without its own sticky top bar + page-level padding.
   * Used when the profile is embedded inside the hub as a bottom-nav tab
   * — the hub already owns the header + bottom-nav chrome, so an
   * additional "Назад" button and "Профіль" label would stack two nav
   * rows. The standalone `/profile` route keeps the default chrome so
   * deep-links and back-button still behave as before.
   */
  embedded?: boolean;
}

export function ProfilePage({ embedded = false }: ProfilePageProps = {}) {
  const navigate = useNavigate();
  const { user, logout, refresh } = useAuth();
  const online = useOnlineStatus();

  if (!user) {
    return null;
  }

  // Each section is wrapped in a `CollapsibleSection` so the page reads as
  // a stack of single-line entry-points by default and the user opens only
  // what they need. `Особиста інформація` defaults to open because it is
  // the identity preview (avatar + name + email + verification banner) —
  // the section a user opening Profile most often wants to glance at. The
  // remaining four sections — Memory, Password, Sessions, Danger zone —
  // default to collapsed; their open/closed state is persisted per
  // `storageKey` so the user's preference survives reload. Multiple
  // sections can be open simultaneously (non-mutually-exclusive).
  const body = (
    <div className="max-w-lg mx-auto px-5 pb-10 space-y-2 pt-6">
      {!online && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 mb-2">
          <Icon name="wifi-off" size={16} className="text-warning shrink-0" />
          <p className="text-sm text-warning font-medium">
            Ви офлайн — редагування профілю тимчасово недоступне
          </p>
        </div>
      )}

      <CollapsibleSection
        storageKey="sergeant.profile.personalInfo.open"
        title="Особиста інформація"
        defaultOpen
        collapsedIcon="user"
        collapsedSubtitle={user.email ?? user.name ?? undefined}
      >
        <PersonalInfoSection user={user} online={online} onRefresh={refresh} />
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="sergeant.profile.memory.open"
        title="Пам'ять"
        defaultOpen={false}
        collapsedIcon="brain"
        collapsedSubtitle="Що асистент знає про тебе"
      >
        <MemoryBankSection />
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="sergeant.profile.password.open"
        title="Пароль"
        defaultOpen={false}
        collapsedIcon="settings"
        collapsedSubtitle="Зміна пароля"
      >
        <ChangePasswordSection online={online} />
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="sergeant.profile.sessions.open"
        title="Активні сесії"
        defaultOpen={false}
        collapsedIcon="clock"
        collapsedSubtitle="Пристрої з доступом до акаунта"
      >
        <SessionsSection online={online} />
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="sergeant.profile.danger.open"
        title="Видалення акаунта"
        defaultOpen={false}
        collapsedIcon="alert-triangle"
        collapsedSubtitle="Незворотні дії"
      >
        <DangerZoneSection online={online} onLogout={logout} />
      </CollapsibleSection>
    </div>
  );

  if (embedded) {
    // Embedded mode: no sticky back-bar, no page-level safe-area padding
    // — the hub shell already owns the header + bottom-nav chrome and
    // the main scroll container. The section just renders its body.
    return body;
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

      {body}
    </div>
  );
}
