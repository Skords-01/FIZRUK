/**
 * Deep-link target for `sergeant://food/recipe/{id}`.
 * Показує збережений на пристрої рецепт (MMKV, ключ `NUTRITION_SAVED_RECIPES`).
 */
import { useLocalSearchParams } from "expo-router";

import { RecipeDetailPage } from "@/modules/nutrition/pages/RecipeDetail";

export default function NutritionRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeDetailPage id={id} />;
}
