import { toLocalISODate } from "@shared/lib/date.js";
import { nutritionStorage } from "./nutritionStorageInstance.js";

export const WATER_LOG_KEY = "nutrition_water_v1";
export const DEFAULT_WATER_GOAL_ML = 2000;

export function loadWaterLog(key = WATER_LOG_KEY) {
  const v = nutritionStorage.readJSON(key, {});
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

export function saveWaterLog(log, key = WATER_LOG_KEY) {
  return nutritionStorage.writeJSON(key, log || {});
}

export function getTodayWaterMl(log) {
  return Number(log?.[toLocalISODate()] || 0);
}

export function addWaterMl(log, ml) {
  const today = toLocalISODate();
  return { ...log, [today]: Number(log?.[today] || 0) + Number(ml) };
}

export function resetTodayWater(log) {
  const today = toLocalISODate();
  const { [today]: _removed, ...rest } = log;
  return rest;
}
