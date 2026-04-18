import { http } from "../httpClient";

/**
 * Nutrition-специфічний POST: додає заголовок `X-Token`, якщо
 * задано `VITE_NUTRITION_API_TOKEN`. Повертає розпарсений JSON.
 */
export const nutritionApi = {
  postJson: <T = unknown>(url: string, body: unknown): Promise<T> => {
    const rawToken =
      typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_NUTRITION_API_TOKEN
        ? String(import.meta.env.VITE_NUTRITION_API_TOKEN)
        : "";
    return http.post<T>(url, body ?? {}, {
      headers: rawToken ? { "X-Token": rawToken } : {},
    });
  },
};
