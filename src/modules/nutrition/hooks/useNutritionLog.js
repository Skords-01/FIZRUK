import { useEffect, useState } from "react";
import {
  NUTRITION_LOG_KEY,
  loadNutritionLog,
  persistNutritionLog,
  addLogEntry,
  removeLogEntry,
} from "../lib/nutritionStorage.js";

export function useNutritionLog() {
  const [nutritionLog, setNutritionLog] = useState(() => loadNutritionLog(NUTRITION_LOG_KEY));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addMealSheetOpen, setAddMealSheetOpen] = useState(false);
  const [addMealPhotoResult, setAddMealPhotoResult] = useState(null);
  const [storageErr, setStorageErr] = useState("");

  useEffect(() => {
    const ok = persistNutritionLog(nutritionLog, NUTRITION_LOG_KEY);
    setStorageErr(
      ok ? "" : "Не вдалося зберегти журнал (переповнення сховища або приватний режим).",
    );
  }, [nutritionLog]);

  const handleAddMeal = (meal) => {
    setNutritionLog((log) => addLogEntry(log, selectedDate, meal));
    setAddMealSheetOpen(false);
    setAddMealPhotoResult(null);
  };

  const handleRemoveMeal = (date, id) => {
    setNutritionLog((log) => removeLogEntry(log, date, id));
  };

  return {
    nutritionLog,
    setNutritionLog,
    selectedDate,
    setSelectedDate,
    addMealSheetOpen,
    setAddMealSheetOpen,
    addMealPhotoResult,
    setAddMealPhotoResult,
    handleAddMeal,
    handleRemoveMeal,
    storageErr,
  };
}
