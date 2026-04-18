import { http } from "../httpClient";

export interface FoodSearchProduct {
  id?: string | number;
  name?: string;
  brand?: string;
  [key: string]: unknown;
}

export interface FoodSearchResponse {
  products?: FoodSearchProduct[];
  error?: string;
}

export const foodSearchApi = {
  search: (query: string, opts?: { signal?: AbortSignal }) =>
    http.get<FoodSearchResponse>("/api/food-search", {
      query: { q: query },
      signal: opts?.signal,
    }),
};
