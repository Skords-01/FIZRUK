import type { ReactNode } from "react";
import type { ToastApi } from "@shared/hooks/useToast";
import { hapticTap, hapticWarning } from "./haptic";

export interface UndoToastOptions {
  /** Текст, який бачить користувач ("Видалено звичку «Вода»"). */
  msg: ReactNode;
  /** Скільки мс тримати toast відкритим (default 5000, як і просив продакт-бриф). */
  duration?: number;
  /** Лейбл для кнопки undo ("Повернути"). */
  undoLabel?: string;
  /** Викликається, коли юзер натиснув undo — ти відновлюєш локальний state / БД. */
  onUndo: () => void;
}

/**
 * Обгортка над `useToast().show`, що стандартизує patern для
 * деструктивних дій (видалення звички / транзакції / сета) під єдиний
 * 5-секундний таймер із undo-кнопкою.
 *
 * Виклик:
 * ```tsx
 * const toast = useToast();
 * showUndoToast(toast, {
 *   msg: "Видалено звичку «Вода»",
 *   onUndo: () => restoreHabit(habit),
 * });
 * ```
 *
 * Haptic: викликається `hapticWarning()` на появу toast, і `hapticTap()`
 * на натискання undo — щоб користувач фізично відчув і небезпечну дію,
 * і виправлення.
 */
export function showUndoToast(
  toast: ToastApi,
  { msg, duration = 5000, undoLabel = "Повернути", onUndo }: UndoToastOptions,
): number {
  hapticWarning();
  return toast.show(msg, "info", duration, {
    label: undoLabel,
    onClick: () => {
      hapticTap();
      try {
        onUndo();
      } catch {
        /* caller повинен сам лапати помилки — undo ідемпотентне */
      }
    },
  });
}
