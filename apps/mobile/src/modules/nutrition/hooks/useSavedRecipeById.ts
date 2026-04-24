import { useEffect, useState } from "react";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

import { getRecipeById, type SavedRecipe } from "../lib/recipeBookStore";

export function useSavedRecipeById(id: string | string[] | undefined): {
  recipe: SavedRecipe | undefined;
  recipeId: string;
} {
  const recipeId = Array.isArray(id) ? (id[0] ?? "") : (id ?? "");
  const [recipe, setRecipe] = useState<SavedRecipe | undefined>(() =>
    recipeId ? getRecipeById(String(recipeId)) : undefined,
  );

  useEffect(() => {
    const key = String(recipeId || "").trim();
    if (!key) {
      setRecipe(undefined);
      return;
    }
    setRecipe(getRecipeById(key));
    const mmkv = _getMMKVInstance();
    const sub = mmkv.addOnValueChangedListener((changedKey) => {
      if (changedKey === STORAGE_KEYS.NUTRITION_SAVED_RECIPES) {
        setRecipe(getRecipeById(key));
      }
    });
    return () => sub.remove();
  }, [recipeId]);

  return { recipe, recipeId: String(recipeId) };
}
