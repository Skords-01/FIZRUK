import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeading } from "@shared/components/ui/SectionHeading";
import { Icon } from "@shared/components/ui/Icon";
import { cn } from "@shared/lib/cn";
import {
  countRealEntries,
  getActiveModules,
  getActiveNudge,
  getHideInactiveModules,
  getVibePicks,
  isActiveModule,
  recordLastActiveDate,
  setHideInactiveModules,
  shouldShowReengagement,
  type User,
} from "@sergeant/shared";
import { openHubModule, openHubModuleWithAction } from "@shared/lib/hubNav";
import { getModulePrimaryAction } from "@shared/lib/moduleQuickActions";
import { TodayFocusCard, useDashboardFocus } from "../insights/TodayFocusCard";
import { HubInsightsPanel } from "./HubInsightsPanel";
import {
  WeeklyDigestCard,
  hasLiveWeeklyDigest,
} from "../insights/WeeklyDigestCard";
import { useCoachInsight } from "../insights/useCoachInsight";
import { AssistantAdviceCard } from "../insights/AssistantAdviceCard";
import { SoftAuthPromptCard } from "../onboarding/SoftAuthPromptCard";
import { FirstActionHeroCard } from "../onboarding/FirstActionSheet";
import { detectFirstRealEntry } from "../onboarding/firstRealEntry";
import {
  getSessionDays,
  isFirstActionPending,
  isSoftAuthDismissed,
  recordSessionDay,
} from "../onboarding/vibePicks";
import { useFirstEntryCelebration } from "../onboarding/useFirstEntryCelebration";
import { CelebrationModal } from "../onboarding/CelebrationModal";
import { DailyNudge } from "../onboarding/DailyNudge";
import { ReEngagementCard } from "../onboarding/ReEngagementCard";
import { ModuleChecklist } from "../onboarding/ModuleChecklist";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { DASHBOARD_MODULE_LABELS as SHARED_DASHBOARD_MODULE_LABELS } from "@sergeant/shared";
import {
  loadDashboardOrder,
  localStorageStore,
  saveDashboardOrder,
} from "./dashboard/dashboardStore";
import { type ModuleId } from "./dashboard/moduleConfigs";
import { SortableCard } from "./dashboard/BentoCard";
import {
  MotivationalFooter,
  StaggerChild,
  StreakIndicator,
  TodaySummaryStrip,
  WeeklyDigestFooter,
} from "./dashboard/dashboardCards";
import { useMondayAutoDigest } from "./dashboard/useMondayAutoDigest";

export const DASHBOARD_MODULE_LABELS = SHARED_DASHBOARD_MODULE_LABELS;
export {
  loadDashboardOrder,
  saveDashboardOrder,
  resetDashboardOrder,
} from "./dashboard/dashboardStore";

interface HubDashboardProps {
  onOpenModule: (module: string) => void;
  onOpenChat?: () => void;
  user: User | null;
  onShowAuth: () => void;
}

export function HubDashboard({
  onOpenModule,
  onOpenChat: _onOpenChat,
  user,
  onShowAuth,
}: HubDashboardProps) {
  const [order, setOrder] = useState(loadDashboardOrder);
  useMondayAutoDigest();

  const [firstActionVisible, setFirstActionVisible] = useState(() =>
    isFirstActionPending(),
  );

  const hasRealEntry = detectFirstRealEntry();
  const celebration = useFirstEntryCelebration(hasRealEntry);
  const [sessionDays, setSessionDays] = useState(-1);
  useEffect(() => {
    setSessionDays(recordSessionDay() || getSessionDays());
  }, []);
  const SOFT_AUTH_SESSION_DAYS_THRESHOLD = 3;
  // Скільки сеансів-днів має минути після першого реального запису, перш
  // ніж показати SoftAuth. `1` означає «не на тому ж дні»: користувач,
  // що щойно завершив `FirstActionHeroCard` → `CelebrationModal`, не
  // отримує одразу прохання створити акаунт. Картка чекає наступного
  // повернення (sessionDays ≥ 2). Це зберігає «win-момент» цілим, а
  // самій картці дає вищий signal-to-noise: якщо юзер повернувся —
  // він уже залучений.
  const SOFT_AUTH_AFTER_ENTRY_MIN_SESSION_DAYS = 2;
  const [softAuthDismissed, setSoftAuthDismissed] = useState(() =>
    isSoftAuthDismissed(),
  );
  const entryCount = useMemo(() => countRealEntries(localStorageStore), []);
  const showSoftAuth =
    !user &&
    !softAuthDismissed &&
    typeof onShowAuth === "function" &&
    ((hasRealEntry && sessionDays >= SOFT_AUTH_AFTER_ENTRY_MIN_SESSION_DAYS) ||
      sessionDays >= SOFT_AUTH_SESSION_DAYS_THRESHOLD);

  const [reengagement, setReengagement] = useState(() =>
    shouldShowReengagement(localStorageStore),
  );
  useEffect(() => {
    recordLastActiveDate(localStorageStore);
  }, []);

  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const activeNudge = useMemo(() => {
    if (nudgeDismissed || sessionDays < 2) return null;
    return getActiveNudge(localStorageStore, sessionDays, {
      picks: getVibePicks(localStorageStore),
    });
  }, [sessionDays, nudgeDismissed]);

  // Active vs. inactive modules — driven by the user's onboarding
  // "vibe picks". Inactive modules render greyed-out (or hidden when
  // the user has flipped the `hideInactive` toggle below).
  const activeModules = useMemo(() => getActiveModules(localStorageStore), []);
  const [hideInactive, setHideInactive] = useState(() =>
    getHideInactiveModules(localStorageStore),
  );
  const toggleHideInactive = useCallback(() => {
    setHideInactive((prev) => {
      const next = !prev;
      setHideInactiveModules(localStorageStore, next);
      return next;
    });
  }, []);
  const hasInactive = useMemo(
    () => order.some((id) => !isActiveModule(activeModules, id)),
    [order, activeModules],
  );
  // Bento "edit mode" — toggled by the explicit "Налаштувати" button next
  // to the Modules heading. Drives the wiggle animation, the visible drag
  // handle on each card, and gates dnd-kit listeners to the handle so the
  // card body can keep navigating to the module on tap.
  const [editMode, setEditMode] = useState(false);
  const toggleEditMode = useCallback(() => setEditMode((p) => !p), []);
  const visibleOrder = useMemo(
    () =>
      hideInactive
        ? order.filter((id) => isActiveModule(activeModules, id))
        : order,
    [order, activeModules, hideInactive],
  );

  const { focus, rest, dismiss } = useDashboardFocus();

  // Insights з deep-link (`actionHash`) повинні відкрити модуль рівно
  // на потрібній вкладці/елементі — не на дефолтному Огляді. Якщо
  // hash немає, лишаємо стару поведінку (просто перейти на модуль).
  const openInsightTarget = useCallback(
    (module: string, hash?: string) => {
      if (hash) {
        openHubModule(module as Parameters<typeof openHubModule>[0], hash);
        return;
      }
      onOpenModule(module);
    },
    [onOpenModule],
  );

  const {
    insight: coachInsightText,
    loading: coachLoading,
    error: coachError,
    refresh: coachRefresh,
  } = useCoachInsight();

  const modulesWithSignal = useMemo(() => {
    const all = focus ? [focus, ...rest] : rest;
    const set = new Set<string>();
    for (const r of all) {
      if (r.module && r.module !== "hub") set.add(r.module);
    }
    return set;
  }, [focus, rest]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const quickAddByModule = useMemo(() => {
    const map: Record<string, { label: string; run: () => void } | undefined> =
      {};
    const activeSet = new Set<string>(activeModules);
    for (const id of modulesWithSignal) {
      // Suppress quick-add for inactive modules — the BentoCard
      // already hides the affordance, but skipping here keeps the
      // registry tidy and avoids accidental wiring downstream.
      if (!activeSet.has(id)) continue;
      const quick = getModulePrimaryAction(id);
      if (!quick) continue;
      map[id] = {
        label: quick.label,
        run: () =>
          openHubModuleWithAction(
            id as Parameters<typeof openHubModuleWithAction>[0],
            quick.action,
          ),
      };
    }
    return map;
  }, [modulesWithSignal, activeModules]);

  const handleDragEnd = useCallback(
    (event: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) => {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
        setOrder((prev) => {
          const activeId = String(active.id) as ModuleId;
          const overId = String(over.id) as ModuleId;
          const oldIndex = prev.indexOf(activeId);
          const newIndex = prev.indexOf(overId);
          const next = arrayMove(prev, oldIndex, newIndex);
          saveDashboardOrder(next);
          return next;
        });
      }
    },
    [],
  );

  const [digestExpanded, setDigestExpanded] = useState(false);
  const digestFresh = hasLiveWeeklyDigest();
  const now = new Date();
  const isMondayOrTuesday = now.getDay() === 1 || now.getDay() === 2;
  const showDigestFooter = digestFresh || isMondayOrTuesday;

  // Show checklist for first active module (only if user has no real entry yet)
  const primaryModule = activeModules[0] as
    | "finyk"
    | "fizruk"
    | "routine"
    | "nutrition"
    | undefined;
  const showChecklist = primaryModule && !hasRealEntry && sessionDays <= 7;

  // ONE-HERO RULE
  let hero: React.ReactNode;
  if (firstActionVisible) {
    hero = (
      <FirstActionHeroCard onDismiss={() => setFirstActionVisible(false)} />
    );
  } else if (showSoftAuth) {
    hero = (
      <SoftAuthPromptCard
        onOpenAuth={onShowAuth}
        onDismiss={() => setSoftAuthDismissed(true)}
        entryCount={entryCount}
      />
    );
  } else {
    hero = (
      <TodayFocusCard
        focus={focus}
        onAction={onOpenModule}
        onDismiss={dismiss}
      />
    );
  }

  // Stagger index counter
  let si = 0;

  // ONE-HERO + ONE-SECONDARY RULE:
  // • Returning user (7+ days inactive) → ReEngagementCard acts as the
  //   hero, suppressing the regular TodayFocus / FirstAction / SoftAuth
  //   candidates so we never stack two "primary" cards.
  // • DailyNudge is the optional secondary nudge; it already hides when
  //   re-engagement is showing (see below), and now supports a 7-day
  //   snooze via `snoozeNudge()` on top of permanent dismiss.
  const reengagementIsHero = reengagement.show;

  return (
    <div className="space-y-4">
      {reengagementIsHero && (
        <StaggerChild index={si++}>
          <ReEngagementCard
            daysInactive={reengagement.daysInactive}
            onContinue={() => setReengagement({ show: false, daysInactive: 0 })}
            onDismiss={() => setReengagement({ show: false, daysInactive: 0 })}
          />
        </StaggerChild>
      )}

      {/* Streak indicator */}
      <StaggerChild index={si++}>
        <StreakIndicator />
      </StaggerChild>

      {/* Hero card — suppressed while re-engagement takes the hero slot */}
      {!reengagementIsHero && <StaggerChild index={si++}>{hero}</StaggerChild>}

      {/* Module onboarding checklist */}
      {showChecklist && primaryModule && (
        <StaggerChild index={si++}>
          <ModuleChecklist
            moduleId={primaryModule}
            onAction={(action) => {
              openHubModuleWithAction(
                primaryModule as Parameters<typeof openHubModuleWithAction>[0],
                action as Parameters<typeof openHubModuleWithAction>[1],
              );
            }}
          />
        </StaggerChild>
      )}

      {/* "Твій день" summary strip */}
      <StaggerChild index={si++}>
        <TodaySummaryStrip onOpenModule={onOpenModule} />
      </StaggerChild>

      {/* «Підказки» секція: AssistantAdvice + DailyNudge — обидві
       * картки показували пораду на день, але рендерились як два
       * незалежних блоки з різним візуальним chrome. Об’єднання під
       * одним SectionHeading знижує card-density і дає зрозуміти,
       * що ці елементи логічно одного класу — пораджу-стрічка. */}
      <StaggerChild index={si++}>
        <section className="space-y-2">
          <SectionHeading as="h2" size="xs" className="!px-0">
            Підказки
          </SectionHeading>
          <AssistantAdviceCard
            insight={coachInsightText}
            loading={coachLoading}
            error={coachError}
            onRefresh={coachRefresh}
          />
          {activeNudge && !reengagement.show && (
            <DailyNudge
              nudge={activeNudge}
              sessionDays={sessionDays}
              onDismiss={() => setNudgeDismissed(true)}
            />
          )}
        </section>
      </StaggerChild>

      {/* MODULE CARDS — 2×2 bento grid */}
      <StaggerChild index={si++}>
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <SectionHeading as="h2" size="xs" className="!px-0">
              Модулі
            </SectionHeading>
            <button
              type="button"
              onClick={toggleEditMode}
              aria-pressed={editMode}
              className={cn(
                "inline-flex items-center gap-1.5 text-2xs font-medium rounded-lg px-2 py-1 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                editMode
                  ? "bg-primary text-bg"
                  : "text-muted hover:text-text hover:bg-panelHi",
              )}
            >
              <Icon
                name="grip-vertical"
                size={12}
                strokeWidth={2}
                aria-hidden
              />
              {editMode ? "Готово" : "Налаштувати"}
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleOrder}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3">
                {visibleOrder.map((id) => (
                  <SortableCard
                    key={id}
                    id={id as ModuleId}
                    onOpenModule={onOpenModule}
                    quickAdd={quickAddByModule[id] || null}
                    inactive={!isActiveModule(activeModules, id)}
                    editMode={editMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {hasInactive && (
            <button
              type="button"
              onClick={toggleHideInactive}
              className="mx-auto mt-2 block text-2xs text-muted underline-offset-2 hover:text-text hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {hideInactive
                ? "Показати неактивні модулі"
                : "Приховати неактивні модулі"}
            </button>
          )}
        </section>
      </StaggerChild>

      {/* «Аналітика» секція: insights-panel + weekly-digest. Обидва —
       * data-driven блоки на історії, які раніше рендерились без
       * групувального заголовка і виглядали як ще «дві картки» серед
       * ~6 інших. Один SectionHeading робить очевидним, що це окремий
       * шар, на відміну від одноразової «Підказки». */}
      <StaggerChild index={si++}>
        <section className="space-y-2">
          <SectionHeading as="h2" size="xs" className="!px-0">
            Аналітика
          </SectionHeading>
          <HubInsightsPanel
            items={rest}
            onOpenModule={openInsightTarget}
            onDismiss={dismiss}
          />

          {digestExpanded ? (
            <WeeklyDigestCard onCollapse={() => setDigestExpanded(false)} />
          ) : showDigestFooter ? (
            <WeeklyDigestFooter
              fresh={digestFresh}
              onExpand={() => setDigestExpanded(true)}
            />
          ) : null}
        </section>
      </StaggerChild>

      {/* Motivational footer */}
      <MotivationalFooter />

      {/* First entry celebration modal */}
      <CelebrationModal
        open={celebration.open}
        onClose={celebration.close}
        ttvMs={celebration.ttvMs}
      />
    </div>
  );
}
