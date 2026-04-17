import { useState, useCallback, useEffect } from "react";
import { cn } from "@shared/lib/cn";
import { HubRecommendations } from "./HubRecommendations.jsx";
import { WeeklyDigestCard } from "./WeeklyDigestCard.jsx";
import { CoachInsightCard } from "./CoachInsightCard.jsx";
import { useWeeklyDigest, loadDigest, getWeekKey } from "./useWeeklyDigest.js";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DASHBOARD_ORDER_KEY = "hub_dashboard_order_v1";
const DEFAULT_ORDER = ["finyk", "fizruk", "routine", "nutrition"];
const HUB_PREFS_KEY = "hub_prefs_v1";

function safeParseLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

function loadOrder() {
  const saved = safeParseLS(DASHBOARD_ORDER_KEY, null);
  if (
    Array.isArray(saved) &&
    saved.length === DEFAULT_ORDER.length &&
    DEFAULT_ORDER.every((id) => saved.includes(id))
  ) {
    return saved;
  }
  return [...DEFAULT_ORDER];
}

function saveOrder(order) {
  try {
    localStorage.setItem(DASHBOARD_ORDER_KEY, JSON.stringify(order));
  } catch {}
}

export function resetDashboardOrder() {
  try {
    localStorage.removeItem(DASHBOARD_ORDER_KEY);
  } catch {}
}

function DashCard({
  icon,
  label,
  colorClass,
  gradientClass,
  children,
  onClick,
  dragProps,
  isDragging: dragging,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full p-4 rounded-2xl border border-line bg-panel text-left",
        "shadow-card hover:shadow-float transition-all duration-200 active:scale-[0.98]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-text/20",
        dragging && "opacity-60 scale-[0.97] shadow-float z-50",
      )}
      {...dragProps}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
          gradientClass,
        )}
      />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[13px]",
              colorClass,
            )}
          >
            {icon}
          </div>
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            {label}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ml-auto text-muted/60 group-hover:text-muted group-hover:translate-x-0.5 transition-all shrink-0"
            aria-hidden
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        {children}
      </div>
    </button>
  );
}

const MODULE_CONFIGS = {
  finyk: {
    icon: "💳",
    label: "Фінік",
    colorClass: "bg-emerald-500/10 text-emerald-600",
    gradientClass: "bg-gradient-to-br from-emerald-400/10 to-teal-400/5",
    description: "Транзакції, бюджети, борги",
  },
  fizruk: {
    icon: "🏋️",
    label: "Фізрук",
    colorClass: "bg-sky-500/10 text-sky-600",
    gradientClass: "bg-gradient-to-br from-sky-400/10 to-indigo-400/5",
    description: "Тренування та відновлення",
  },
  routine: {
    icon: "✅",
    label: "Рутина",
    colorClass: "bg-orange-500/10 text-orange-600",
    gradientClass: "bg-gradient-to-br from-orange-400/10 to-rose-400/5",
    description: "Звички та серії",
  },
  nutrition: {
    icon: "🥗",
    label: "Харчування",
    colorClass: "bg-lime-500/10 text-lime-700",
    gradientClass: "bg-gradient-to-br from-lime-400/10 to-emerald-400/5",
    description: "КБЖВ та прийоми їжі",
  },
};

function SortableCard({ id, onOpenModule }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cfg = MODULE_CONFIGS[id];
  if (!cfg) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <DashCard
        icon={cfg.icon}
        label={cfg.label}
        colorClass={cfg.colorClass}
        gradientClass={cfg.gradientClass}
        onClick={() => onOpenModule(id)}
        isDragging={isDragging}
        dragProps={{ ...attributes, ...listeners }}
      >
        <p className="text-xs text-muted">{cfg.description}</p>
      </DashCard>
    </div>
  );
}

function useMondayAutoDigest() {
  const { generate } = useWeeklyDigest();

  useEffect(() => {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    if (!isMonday) return;

    const weekKey = getWeekKey(now);
    const existing = loadDigest(weekKey);
    if (existing) return;

    const timer = setTimeout(() => {
      generate();
    }, 3000);
    return () => clearTimeout(timer);
  }, [generate]);
}

export function HubDashboard({ onOpenModule, onOpenChat }) {
  const [order, setOrder] = useState(loadOrder);
  useMondayAutoDigest();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id);
        const newIndex = prev.indexOf(over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        saveOrder(next);
        return next;
      });
    }
  }, []);

  const [showCoach, setShowCoach] = useState(
    () => safeParseLS(HUB_PREFS_KEY, {}).showCoach !== false,
  );
  useEffect(() => {
    const handler = (e) => {
      if (e.key === HUB_PREFS_KEY || e.key === null) {
        setShowCoach(safeParseLS(HUB_PREFS_KEY, {}).showCoach !== false);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <div className="space-y-4">
      <HubRecommendations onOpenModule={onOpenModule} />

      {showCoach && <CoachInsightCard onOpenChat={onOpenChat} />}

      <WeeklyDigestCard />

      <div className="space-y-2.5">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider px-0.5 flex items-center gap-1.5">
          Сьогодні
          <span className="text-[10px] text-subtle/60 font-normal normal-case tracking-normal">
            · утримуй щоб переставити
          </span>
        </h2>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2.5">
              {order.map((id) => (
                <SortableCard key={id} id={id} onOpenModule={onOpenModule} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
