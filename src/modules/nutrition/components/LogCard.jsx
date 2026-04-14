import { Input } from "@shared/components/ui/Input";
import { cn } from "@shared/lib/cn";
import { getDayMacros } from "../lib/nutritionStorage.js";
import { MEAL_ORDER, MEAL_META, isMealTypeId, mealTypeFromLabel } from "../lib/mealTypes.js";

const MACRO_TILES = [
  { key: "kcal", label: "Ккал", color: "text-nutrition", targetKey: "dailyTargetKcal" },
  { key: "protein_g", label: "Білки", color: "text-blue-400", targetKey: "dailyTargetProtein_g" },
  { key: "fat_g", label: "Жири", color: "text-yellow-400", targetKey: "dailyTargetFat_g" },
  { key: "carbs_g", label: "Вугл.", color: "text-orange-400", targetKey: "dailyTargetCarbs_g" },
];

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (isoDate === today) return "Сьогодні";
  if (isoDate === yesterday) return "Вчора";
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

function groupByMealType(meals) {
  const groups = {};
  for (const meal of meals) {
    const mealType = isMealTypeId(meal.mealType)
      ? meal.mealType
      : mealTypeFromLabel(meal.label);
    if (!groups[mealType]) groups[mealType] = [];
    groups[mealType].push(meal);
  }
  return groups;
}

function pct(current, target) {
  if (!(target > 0)) return 0;
  return Math.min(100, (current / target) * 100);
}

export function LogCard({
  log,
  selectedDate,
  setSelectedDate,
  onAddMeal,
  onRemoveMeal,
  prefs,
  setPrefs,
}) {
  const macros = getDayMacros(log, selectedDate);
  const dayData = log[selectedDate];
  const meals = dayData?.meals || [];
  const groups = groupByMealType(meals);

  function shiftDate(delta) {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + delta);
    const nextIso = toISODate(next);
    const todayIso = toISODate(new Date());
    if (nextIso <= todayIso) setSelectedDate(nextIso);
  }

  const isToday = selectedDate === toISODate(new Date());

  function setTarget(key, raw) {
    const v = String(raw ?? "").trim().replace(",", ".");
    setPrefs((p) => {
      if (v === "") return { ...p, [key]: null };
      const n = Number(v);
      return { ...p, [key]: Number.isFinite(n) && n > 0 ? n : null };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-panelHi text-muted hover:text-text transition-colors"
          aria-label="Попередній день"
        >
          ‹
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-extrabold text-text text-base">{formatDate(selectedDate)}</span>
          <span className="text-[11px] text-subtle">{selectedDate}</span>
        </div>
        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className={cn(
            "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
            isToday ? "text-line cursor-not-allowed" : "bg-panelHi text-muted hover:text-text",
          )}
          aria-label="Наступний день"
        >
          ›
        </button>
      </div>

      <div className="rounded-2xl border border-line/50 bg-panel/40 px-3 py-3">
        <div className="text-[10px] font-bold text-subtle uppercase tracking-widest mb-2">
          Цілі на день (необов’язково)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MACRO_TILES.map(({ label, targetKey }) => (
            <div key={targetKey}>
              <div className="text-[10px] text-subtle mb-0.5">{label}</div>
              <Input
                value={prefs[targetKey] != null ? String(prefs[targetKey]) : ""}
                onChange={(e) => setTarget(targetKey, e.target.value)}
                inputMode="decimal"
                placeholder="—"
                aria-label={`Ціль: ${label}`}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {MACRO_TILES.map(({ key, label, color, targetKey }) => {
          const target = prefs[targetKey];
          const hasTarget = target != null && target > 0;
          const cur = macros[key];
          return (
            <div
              key={key}
              className="bg-panelHi rounded-2xl px-2 py-3 flex flex-col items-center gap-1"
            >
              <span className={cn("text-lg font-extrabold tabular-nums leading-none", color)}>
                {Math.round(cur)}
              </span>
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">
                {label}
              </span>
              {hasTarget && (
                <div className="w-full mt-1 h-1 rounded-full bg-line/80 overflow-hidden" title={`${Math.round(cur)} / ${Math.round(target)}`}>
                  <div
                    className="h-full rounded-full bg-nutrition/90 transition-[width]"
                    style={{ width: `${pct(cur, target)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {meals.length === 0 ? (
        <div className="text-center text-muted text-sm py-8">
          Поки немає записів. Додайте перший прийом їжі.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {MEAL_ORDER.filter((type) => groups[type]?.length).map((type) => {
            const meta = MEAL_META[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{meta.emoji}</span>
                  <span className="text-xs font-bold text-subtle uppercase tracking-widest">
                    {meta.label}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {groups[type].map((meal) => (
                    <MealRow
                      key={meal.id}
                      meal={meal}
                      onRemove={() => onRemoveMeal(selectedDate, meal.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onAddMeal}
        className="w-full h-12 min-h-[44px] rounded-2xl border-2 border-dashed border-line text-muted hover:border-nutrition/60 hover:text-nutrition font-semibold text-sm transition-all"
      >
        + Додати прийом їжі
      </button>
    </div>
  );
}

function MealRow({ meal, onRemove }) {
  const mac = meal.macros || {};
  return (
    <div className="flex items-center gap-3 bg-panelHi rounded-2xl px-3 py-2.5 group">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-text text-sm truncate">{meal.name}</span>
          {meal.time && (
            <span className="text-[11px] text-subtle shrink-0">{meal.time}</span>
          )}
        </div>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {mac.kcal != null && (
            <span className="text-[11px] text-nutrition font-bold">{Math.round(mac.kcal)} ккал</span>
          )}
          {mac.protein_g != null && (
            <span className="text-[11px] text-subtle">Б {Math.round(mac.protein_g)}г</span>
          )}
          {mac.fat_g != null && (
            <span className="text-[11px] text-subtle">Ж {Math.round(mac.fat_g)}г</span>
          )}
          {mac.carbs_g != null && (
            <span className="text-[11px] text-subtle">В {Math.round(mac.carbs_g)}г</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Видалити запис"
      >
        ✕
      </button>
    </div>
  );
}
