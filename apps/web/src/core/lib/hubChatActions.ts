import { handleFinykAction } from "./chatActions/finykActions.js";
import { handleFizrukAction } from "./chatActions/fizrukActions.js";
import { handleRoutineAction } from "./chatActions/routineActions.js";
import { handleNutritionAction } from "./chatActions/nutritionActions.js";
import { handleCrossAction } from "./chatActions/crossActions.js";

export type { ChatAction } from "./chatActions/types.js";

export function executeAction(
  action: import("./chatActions/types.js").ChatAction,
): string {
  try {
    return (
      handleFinykAction(action) ??
      handleFizrukAction(action) ??
      handleRoutineAction(action) ??
      handleNutritionAction(action) ??
      handleCrossAction(action) ??
      `Невідома дія: ${action.name}`
    );
  } catch (e) {
    return `Помилка виконання: ${e instanceof Error ? e.message : String(e)}`;
  }
}
