export type MealTypeId = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealType {
  id: MealTypeId;
  label: string;
  emoji: string;
}

export interface MealMeta {
  label: string;
  emoji: string;
}

export const MEAL_ORDER: readonly MealTypeId[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export const MEAL_TYPES: readonly MealType[] = [
  { id: "breakfast", label: "Сніданок", emoji: "🌅" },
  { id: "lunch", label: "Обід", emoji: "☀️" },
  { id: "dinner", label: "Вечеря", emoji: "🌙" },
  { id: "snack", label: "Перекус", emoji: "🍎" },
];

export const MEAL_META: Record<MealTypeId, MealMeta> = Object.fromEntries(
  MEAL_TYPES.map((t) => [t.id, { label: t.label, emoji: t.emoji }]),
) as Record<MealTypeId, MealMeta>;

const MEAL_TYPE_SET = new Set<string>(MEAL_ORDER);

export function isMealTypeId(id: unknown): id is MealTypeId {
  return typeof id === "string" && MEAL_TYPE_SET.has(id);
}

/** Міграція зі старих записів, де тип був лише в label. */
export function mealTypeFromLabel(label: unknown): MealTypeId {
  const s = String(label ?? "").trim();
  for (const t of MEAL_TYPES) {
    if (t.label === s) return t.id;
  }
  return "snack";
}

export function labelForMealType(id: MealTypeId | string): string {
  return MEAL_TYPES.find((t) => t.id === id)?.label || "Прийом їжі";
}
