import { Icon } from "@shared/components/ui/Icon";
import { HubDashboard } from "../HubDashboard.jsx";
import { HubReports } from "../HubReports.jsx";
import { HubSettingsPage } from "../HubSettingsPage.jsx";
import { OnboardingWizard } from "../OnboardingWizard.jsx";
import { IOSInstallBanner } from "./IOSInstallBanner.jsx";

export function HubMainContent({
  updateAvailable,
  onApplyUpdate,
  canInstall,
  onInstall,
  onDismissInstall,
  onboarding,
  setOnboarding,
  onOpenModule,
  iosVisible,
  onDismissIos,
  hubView,
  onOpenChat,
  dark,
  onToggleDark,
  syncing,
  onSync,
  onPull,
  user,
  onShowAuth,
}) {
  // Post-wizard FTUX is now a non-blocking hero card rendered inline on
  // the dashboard (see `FirstActionHeroCard`), not a third stacked modal.
  // The wizard just flips the `first_action_pending` flag and lands the
  // user on the populated hub.
  //
  // Banner budget: at most one chrome banner above the hub content.
  // Priority: update > install (PWA) > iOS install. This prevents a cold
  // start where update + install + iOS stack three banners before any
  // real data is visible.
  const showUpdate = !!updateAvailable;
  const showInstall = !showUpdate && !!canInstall;
  const showIos = !showUpdate && !showInstall && iosVisible;

  return (
    <>
      {showUpdate && (
        <div className="px-5 max-w-lg mx-auto w-full mb-2">
          <div className="px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary shrink-0"
              aria-hidden
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span className="text-sm text-text flex-1">
              Доступна нова версія
            </span>
            <button
              onClick={onApplyUpdate}
              className="text-sm font-semibold text-primary hover:underline shrink-0"
            >
              Оновити
            </button>
          </div>
        </div>
      )}

      {showInstall && (
        <div className="px-5 max-w-lg mx-auto w-full mb-2">
          <div className="px-4 py-3 rounded-2xl bg-panel border border-line shadow-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                aria-hidden
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">
                Встановити додаток
              </p>
              <p className="text-xs text-muted">
                Працює офлайн, як рідний додаток
              </p>
            </div>
            <button
              onClick={onInstall}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold shrink-0 hover:bg-primary/90 transition-colors"
            >
              Так
            </button>
            <button
              onClick={onDismissInstall}
              className="text-muted hover:text-text shrink-0 p-1"
              aria-label="Закрити"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>
      )}

      {onboarding && (
        <OnboardingWizard
          onDone={(startModuleId, opts = {}) => {
            setOnboarding(false);
            if (opts.intent !== "vibe_demo" && startModuleId) {
              // Legacy paths / external callers: if a module id is
              // explicitly passed, open it immediately. vibe_demo lands
              // on the dashboard where the inline hero card picks up.
              onOpenModule(startModuleId);
            }
          }}
        />
      )}

      {showIos && <IOSInstallBanner onDismiss={onDismissIos} />}

      <main className="flex-1 px-5 pb-28 max-w-lg mx-auto w-full overflow-y-auto">
        {hubView === "dashboard" && (
          <div className="flex flex-col gap-5 pt-2">
            <HubDashboard
              onOpenModule={onOpenModule}
              onOpenChat={onOpenChat}
              user={user}
              onShowAuth={onShowAuth}
            />
          </div>
        )}

        {hubView === "reports" && (
          <div className="pt-2">
            <HubReports />
          </div>
        )}

        {hubView === "settings" && (
          <HubSettingsPage
            dark={dark}
            onToggleDark={onToggleDark}
            syncing={syncing}
            onSync={onSync}
            onPull={onPull}
            user={user}
          />
        )}
      </main>
    </>
  );
}
