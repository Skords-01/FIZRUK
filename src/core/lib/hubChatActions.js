import { resolveExpenseCategoryMeta } from "../../modules/finyk/utils";
import { ls, lsSet } from "./hubChatUtils.js";

export function executeAction(action) {
  try {
    switch (action.name) {
      case "change_category": {
        const { tx_id, category_id } = action.input;
        const cats = ls("finyk_tx_cats", {});
        cats[tx_id] = category_id;
        lsSet("finyk_tx_cats", cats);
        const customC = ls("finyk_custom_cats_v1", []);
        const cat = resolveExpenseCategoryMeta(category_id, customC);
        return `Категорію транзакції ${tx_id} змінено на ${cat?.label || category_id}`;
      }
      case "create_debt": {
        const { name, amount, due_date, emoji } = action.input;
        const debts = ls("finyk_debts", []);
        const newDebt = {
          id: `d_${Date.now()}`,
          name,
          totalAmount: Number(amount),
          dueDate: due_date || "",
          emoji: emoji || "💸",
          linkedTxIds: [],
        };
        debts.push(newDebt);
        lsSet("finyk_debts", debts);
        return `Борг "${name}" на ${amount} грн створено (id:${newDebt.id})`;
      }
      case "create_receivable": {
        const { name, amount } = action.input;
        const recv = ls("finyk_recv", []);
        const newRecv = {
          id: `r_${Date.now()}`,
          name,
          amount: Number(amount),
          linkedTxIds: [],
        };
        recv.push(newRecv);
        lsSet("finyk_recv", recv);
        return `Дебіторку "${name}" на ${amount} грн додано (id:${newRecv.id})`;
      }
      case "hide_transaction": {
        const { tx_id } = action.input;
        const hidden = ls("finyk_hidden_txs", []);
        if (!hidden.includes(tx_id)) {
          hidden.push(tx_id);
          lsSet("finyk_hidden_txs", hidden);
        }
        return `Транзакцію ${tx_id} приховано зі статистики`;
      }
      case "set_budget_limit": {
        const { category_id, limit } = action.input;
        const budgets = ls("finyk_budgets", []);
        const idx = budgets.findIndex(
          (b) => b.type === "limit" && b.categoryId === category_id,
        );
        if (idx >= 0) {
          budgets[idx].limit = Number(limit);
        } else {
          budgets.push({
            id: `b_${Date.now()}`,
            type: "limit",
            categoryId: category_id,
            limit: Number(limit),
          });
        }
        lsSet("finyk_budgets", budgets);
        const customC = ls("finyk_custom_cats_v1", []);
        const cat = resolveExpenseCategoryMeta(category_id, customC);
        return `Ліміт ${cat?.label || category_id} встановлено: ${limit} грн`;
      }
      case "set_monthly_plan": {
        const { income, expense, savings } = action.input;
        const cur = ls("finyk_monthly_plan", {});
        const next = { ...cur };
        if (income != null && income !== "") next.income = String(income);
        if (expense != null && expense !== "") next.expense = String(expense);
        if (savings != null && savings !== "") next.savings = String(savings);
        lsSet("finyk_monthly_plan", next);
        return `Фінплан місяця оновлено: дохід ${next.income ?? "—"} / витрати ${next.expense ?? "—"} / заощадження ${next.savings ?? "—"} грн/міс`;
      }
      case "mark_habit_done": {
        const { habit_id, date: habitDate } = action.input;
        const routineState = ls("hub_routine_v1", { habits: [], completions: {} });
        const completions = { ...(routineState.completions || {}) };
        const now = new Date();
        const targetDate =
          habitDate ||
          [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0"),
          ].join("-");
        const arr = Array.isArray(completions[habit_id]) ? completions[habit_id].slice() : [];
        if (!arr.includes(targetDate)) arr.push(targetDate);
        completions[habit_id] = arr;
        lsSet("hub_routine_v1", { ...routineState, completions });
        const habit = (routineState.habits || []).find((h) => h.id === habit_id);
        return `Звичку "${habit?.name || habit_id}" відмічено як виконану (${targetDate})`;
      }
      case "plan_workout": {
        const { date, time, note, exercises } = action.input || {};
        const now = new Date();
        const today = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, "0"),
          String(now.getDate()).padStart(2, "0"),
        ].join("-");
        const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
        const timeStr =
          time && /^\d{1,2}:\d{2}$/.test(String(time).trim())
            ? String(time).trim().padStart(5, "0")
            : "09:00";
        const startedAt = new Date(`${targetDate}T${timeStr}:00`).toISOString();
        const wid = `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const items = Array.isArray(exercises)
          ? exercises
              .filter((ex) => ex && ex.name)
              .map((ex, i) => {
                const setsN = Math.max(1, Math.min(20, Number(ex.sets) || 3));
                const reps =
                  ex.reps != null && Number.isFinite(Number(ex.reps)) ? Number(ex.reps) : 0;
                const weightKg =
                  ex.weight != null && Number.isFinite(Number(ex.weight))
                    ? Number(ex.weight)
                    : 0;
                const sets = Array.from({ length: setsN }, () => ({ weightKg, reps }));
                return {
                  id: `i_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                  nameUk: String(ex.name).trim(),
                  type: "strength",
                  musclesPrimary: [],
                  musclesSecondary: [],
                  sets,
                  durationSec: 0,
                  distanceM: 0,
                };
              })
          : [];
        const newW = {
          id: wid,
          startedAt,
          endedAt: null,
          items,
          groups: [],
          warmup: null,
          cooldown: null,
          note: note ? String(note).trim() : "",
          planned: true,
        };
        const wRaw = localStorage.getItem("fizruk_workouts_v1");
        let existing = [];
        try {
          const parsed = wRaw ? JSON.parse(wRaw) : null;
          if (Array.isArray(parsed)) existing = parsed;
          else if (parsed && Array.isArray(parsed.workouts)) existing = parsed.workouts;
        } catch {}
        lsSet("fizruk_workouts_v1", { schemaVersion: 1, workouts: [newW, ...existing] });
        const exCount = items.length;
        return `Тренування заплановано на ${targetDate} о ${timeStr}${note ? ` ("${note}")` : ""}: ${exCount} вправ${exCount === 1 ? "а" : exCount >= 2 && exCount <= 4 ? "и" : ""} (id:${wid})`;
      }
      case "log_meal": {
        const { name, kcal, protein_g, fat_g, carbs_g } = action.input;
        const nutritionLog = ls("nutrition_log_v1", {});
        const now = new Date();
        const todayKey = [
          now.getFullYear(),
          String(now.getMonth() + 1).padStart(2, "0"),
          String(now.getDate()).padStart(2, "0"),
        ].join("-");
        const dayData = { ...(nutritionLog[todayKey] || { meals: [] }) };
        const meals = Array.isArray(dayData.meals) ? dayData.meals.slice() : [];
        meals.push({
          id: `m_${Date.now()}`,
          name: name || "Без назви",
          macros: {
            kcal: Number(kcal) || 0,
            protein_g: Number(protein_g) || 0,
            fat_g: Number(fat_g) || 0,
            carbs_g: Number(carbs_g) || 0,
          },
          addedAt: new Date().toISOString(),
        });
        nutritionLog[todayKey] = { ...dayData, meals };
        lsSet("nutrition_log_v1", nutritionLog);
        return `Прийом їжі "${name || "Без назви"}" записано: ${Math.round(kcal || 0)} ккал`;
      }
      default:
        return `Невідома дія: ${action.name}`;
    }
  } catch (e) {
    return `Помилка виконання: ${e.message}`;
  }
}
