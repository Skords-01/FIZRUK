import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import { Icon } from "@shared/components/ui/Icon";
import { useToast } from "@shared/hooks/useToast";
import { safeReadStringLS, safeWriteLS } from "@shared/lib/storage";
import type { HubView } from "../hooks/useHubUIState";

// Прапор у localStorage: «звіти-таб уже разово розкривався». Зберігаємо
// timestamp (а не bool), щоб у логах було видно дату розблокування —
// зручно для аналітики FTUX-воронки і для діагностики «чому юзер не
// побачив підказку».
const REPORTS_TAB_REVEALED_AT_KEY = "sergeant.hub.reportsTabRevealedAt";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  iconName?: string;
  iconBody?: ReactNode;
  className?: string;
}

function TabButton({
  active,
  onClick,
  children,
  iconName,
  iconBody,
  className,
}: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        // WCAG 2.5.5 AAA: 48 пкс на мобільному (thumb-zone), 44 пкс на ≥1sm — для desktop вводу
        // достатньо. Focus-ring без альфи, щоб холдити ≥3:1 контраст до bg.
        "flex-1 flex items-center justify-center gap-1.5 min-h-[48px] sm:min-h-[44px] py-2 rounded-xl text-sm font-medium transition-[background-color,color,opacity]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        active
          ? "bg-panel text-text shadow-card"
          : "text-muted hover:text-text",
        className,
      )}
    >
      {iconName ? <Icon name={iconName} size={15} strokeWidth={2} /> : iconBody}
      {children}
    </button>
  );
}

// "dashboard" icon is bespoke (2x2 grid of squares) so we render it inline
// here rather than adding a one-off entry to the shared Icon map.
function DashboardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

interface HubTabsProps {
  hubView: HubView;
  onChange: (view: HubView) => void;
  /**
   * «Звіти» прибрана з tab-strip-а, поки у користувача немає жодного
   * реального запису. Порожній звіт — найгірший FTUX-стан: юзер тапне,
   * побачить «— ₴» і втратить довіру до модуля. Тому tab з'являється
   * лише коли `hasAnyRealEntry()` повертає `true` (див. `firstRealEntry.ts`).
   */
  showReports?: boolean;
}

export function HubTabs({
  hubView,
  onChange,
  showReports = true,
}: HubTabsProps) {
  const toast = useToast();
  // Чи був перехід `showReports: false → true` в межах поточного маунту.
  // Тільки в цьому випадку ми вмикаємо bounce-анімацію + one-time toast.
  // Якщо компонент маунтиться вже з `showReports === true` без флага в
  // localStorage — це або легасі-користувач (виставлявся ще до цього
  // прапора), або повне перезавантаження після розблокування. В обох
  // сценаріях celebrate-toast у момент перезавантаження виглядав би
  // невчасно, тож тихо ставимо флаг і нічого не показуємо.
  const prevShowReportsRef = useRef(showReports);
  const [animateReveal, setAnimateReveal] = useState(false);

  useEffect(() => {
    const prevShowReports = prevShowReportsRef.current;
    prevShowReportsRef.current = showReports;

    if (!showReports) return;
    if (safeReadStringLS(REPORTS_TAB_REVEALED_AT_KEY)) return;

    if (!prevShowReports) {
      // Це справжнє розблокування «в реальному часі»: користувач
      // зробив свій перший реальний запис у поточному сеансі, і
      // `hasAnyRealEntry()` щойно flip-нув. Запускаємо bounce +
      // показуємо нав'язливий, але дружній toast із прямою CTA на
      // вкладку. Toast самозникає за 6с — звідси не лишається
      // постійного chrome-у, тому ризик заглушити подальші важливі
      // toast-и низький.
      safeWriteLS(REPORTS_TAB_REVEALED_AT_KEY, String(Date.now()));
      setAnimateReveal(true);
      toast.info(
        "«Звіти» тепер доступні — короткі зведення по всіх модулях.",
        6000,
        {
          label: "Відкрити",
          onClick: () => onChange("reports"),
        },
      );
      return;
    }

    // Migration / cold-start path: tab уже мав бути розблокований
    // (минулий маунт), просто на ньому не було флага. Ставимо тихо.
    safeWriteLS(REPORTS_TAB_REVEALED_AT_KEY, String(Date.now()));
  }, [showReports, onChange, toast]);

  return (
    <nav
      aria-label="Розділи хабу"
      className="px-5 max-w-lg mx-auto w-full mb-1"
    >
      <div
        role="tablist"
        className="flex rounded-2xl overflow-hidden border border-line bg-panelHi/40 p-0.5 gap-0.5"
      >
        <TabButton
          active={hubView === "dashboard"}
          onClick={() => onChange("dashboard")}
          iconBody={<DashboardIcon />}
        >
          Головна
        </TabButton>

        {showReports && (
          <TabButton
            active={hubView === "reports"}
            onClick={() => onChange("reports")}
            iconName="bar-chart"
            className={animateReveal ? "animate-bounce-in" : undefined}
          >
            Звіти
          </TabButton>
        )}

        <TabButton
          active={hubView === "settings"}
          onClick={() => onChange("settings")}
          iconName="settings"
        >
          Налаштування
        </TabButton>
      </div>
    </nav>
  );
}
