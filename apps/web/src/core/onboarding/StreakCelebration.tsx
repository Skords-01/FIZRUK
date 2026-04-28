/**
 * StreakCelebration — Мікро-святкування при досягненні milestone стріків.
 *
 * Показує короткий toast/banner при 3, 7, 14, 30, 60, 100+ днях активності.
 * Інтегрується з useCelebration для більших milestone (7, 30+).
 */

import { useEffect, useRef, useCallback } from "react";
import { useCelebration } from "@shared/components/ui/CelebrationModal";
import { useToast } from "@shared/hooks/useToast";
import { safeReadLS, safeWriteLS } from "@shared/lib/storage";
import { trackEvent, ANALYTICS_EVENTS } from "../observability/analytics";

const STREAK_STORAGE_KEY = "sergeant:streak_celebrations_shown";
const STREAK_DAYS_KEY = "sergeant:current_streak_days";

interface StreakMilestone {
  days: number;
  type: "toast" | "modal";
  title: string;
  description: string;
  emoji: string;
}

const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    type: "toast",
    title: "3 дні поспіль!",
    description: "Стрік почався. Не зупиняйся!",
    emoji: "🔥",
  },
  {
    days: 7,
    type: "modal",
    title: "Тиждень!",
    description: "7 днів поспіль — це вже звичка. Так тримати!",
    emoji: "🏆",
  },
  {
    days: 14,
    type: "toast",
    title: "2 тижні!",
    description: "Твоя дисципліна вражає.",
    emoji: "💪",
  },
  {
    days: 30,
    type: "modal",
    title: "Місяць!",
    description: "30 днів поспіль. Ти справжній чемпіон!",
    emoji: "🏅",
  },
  {
    days: 60,
    type: "modal",
    title: "60 днів!",
    description: "Два місяці без пропусків. Легендарно!",
    emoji: "⭐",
  },
  {
    days: 100,
    type: "modal",
    title: "100 днів!",
    description: "Сотня днів поспіль. Ти — еліта!",
    emoji: "👑",
  },
];

function getShownMilestones(): number[] {
  const stored = safeReadLS<string>(STREAK_STORAGE_KEY);
  if (!stored || typeof stored !== "string") return [];
  try {
    return JSON.parse(stored) as number[];
  } catch {
    return [];
  }
}

function markMilestoneShown(days: number): void {
  const shown = getShownMilestones();
  if (!shown.includes(days)) {
    shown.push(days);
    safeWriteLS(STREAK_STORAGE_KEY, JSON.stringify(shown));
  }
}

export interface StreakCelebrationProps {
  /** Поточна кількість днів стріку */
  streakDays: number;
  /** Чи активна святкування (default: true) */
  enabled?: boolean;
}

/**
 * Компонент для відстеження та святкування milestone стріків.
 * Автоматично показує toast або modal при досягненні ключових milestone.
 */
export function StreakCelebration({
  streakDays,
  enabled = true,
}: StreakCelebrationProps): null {
  const toast = useToast();
  const { streak: celebrateStreak } = useCelebration();
  const lastCelebratedRef = useRef<number>(0);

  const celebrateMilestone = useCallback(
    (milestone: StreakMilestone) => {
      if (milestone.type === "modal") {
        celebrateStreak(milestone.days, milestone.description);
      } else {
        toast.success(`${milestone.emoji} ${milestone.title}`, 5000);
      }

      trackEvent(ANALYTICS_EVENTS.STREAK_MILESTONE_REACHED, {
        days: milestone.days,
        type: milestone.type,
      });
    },
    [celebrateStreak, toast],
  );

  useEffect(() => {
    if (!enabled || streakDays <= 0) return;
    if (streakDays === lastCelebratedRef.current) return;

    const shownMilestones = getShownMilestones();

    // Знаходимо найбільший milestone, який користувач досяг і ще не бачив
    const eligibleMilestone = STREAK_MILESTONES.filter(
      (m) => streakDays >= m.days && !shownMilestones.includes(m.days),
    ).sort((a, b) => b.days - a.days)[0];

    if (eligibleMilestone) {
      // Невелика затримка щоб UI встиг завантажитись
      const timer = setTimeout(() => {
        markMilestoneShown(eligibleMilestone.days);
        celebrateMilestone(eligibleMilestone);
        lastCelebratedRef.current = streakDays;
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [streakDays, enabled, celebrateMilestone]);

  return null;
}

/**
 * Hook для отримання поточного стріку з localStorage.
 * Повертає кількість послідовних днів активності.
 */
export function useStreakDays(): number {
  // Цей hook має інтегруватись з реальною логікою підрахунку стріку.
  // Поки що повертає значення з localStorage як placeholder.
  const stored = safeReadLS<string>(STREAK_DAYS_KEY);
  return typeof stored === "string" ? parseInt(stored, 10) : 0;
}

/**
 * Оновлює поточний стрік. Викликається при створенні нового запису.
 */
export function updateStreakDays(days: number): void {
  safeWriteLS(STREAK_DAYS_KEY, String(days));
}
