import { useEffect, useState } from "react";
import {
  parseNutritionHash,
  setNutritionHash,
} from "../lib/nutritionRouter.js";

export function useNutritionHashRoute() {
  const [activePage, setActivePage] = useState(() => parseNutritionHash().page);

  useEffect(() => {
    // One-time normalization on mount: handle legacy `#products` → `#pantry`
    // by rewriting the URL in place, without triggering an extra render cycle
    // via the hashchange listener below (the state already holds the correct
    // page because parseNutritionHash maps `products` to `pantry`).
    const initial = parseNutritionHash();
    if (initial.redirectFrom === "products") setNutritionHash("pantry");

    const onHash = () => {
      const p = parseNutritionHash();
      setActivePage(p.page);
      if (p.redirectFrom === "products") setNutritionHash("pantry");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const setActivePageAndHash = (page) => {
    setActivePage(page);
    setNutritionHash(page);
  };

  return { activePage, setActivePage, setActivePageAndHash };
}
