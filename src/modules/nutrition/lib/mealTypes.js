export const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_TYPES = [
  { id: "breakfast", label: "Сніданок", emoji: "🌅" },
  { id: "lunch", label: "Обід", emoji: "☀️" },
  { id: "dinner", label: "Вечеря", emoji: "🌙" },
  { id: "snack", label: "Перекус", emoji: "🍎" },
];

export const MEAL_META = Object.fromEntries(
  MEAL_TYPES.map((t) => [t.id, { label: t.label, emoji: t.emoji }]),
);

const MEAL_TYPE_SET = new Set(MEAL_ORDER);

export function isMealTypeId(id) {
  return typeof id === "string" && MEAL_TYPE_SET.has(id);
}

/** Міграція зі старих записів, де тип був лише в label. */
export function mealTypeFromLabel(label) {
  const s = String(label ?? "").trim();
  for (const t of MEAL_TYPES) {
    if (t.label === s) return t.id;
  }
  return "snack";
}

export function labelForMealType(id) {
  return MEAL_TYPES.find((t) => t.id === id)?.label || "Прийом їжі";
}
