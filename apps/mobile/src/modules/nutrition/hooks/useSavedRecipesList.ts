import { useEffect, useState } from "react";

import { STORAGE_KEYS } from "@sergeant/shared";

import { _getMMKVInstance } from "@/lib/storage";

import { loadSavedRecipes, type SavedRecipe } from "../lib/recipeBookStore";

export function useSavedRecipesList(): { recipes: SavedRecipe[] } {
  const [recipes, setRecipes] = useState<SavedRecipe[]>(() =>
    loadSavedRecipes(),
  );

  useEffect(() => {
    setRecipes(loadSavedRecipes());
    const mmkv = _getMMKVInstance();
    const sub = mmkv.addOnValueChangedListener((key) => {
      if (key === STORAGE_KEYS.NUTRITION_SAVED_RECIPES) {
        setRecipes(loadSavedRecipes());
      }
    });
    return () => sub.remove();
  }, []);

  return { recipes };
}
