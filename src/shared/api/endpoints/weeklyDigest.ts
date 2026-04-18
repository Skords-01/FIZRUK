import { http } from "../httpClient";

export interface WeeklyDigestPayload {
  weekRange: unknown;
  finyk: unknown;
  fizruk: unknown;
  nutrition: unknown;
  routine: unknown;
}

export interface WeeklyDigestResponse {
  report?: unknown;
  generatedAt?: string;
  error?: string;
}

export const weeklyDigestApi = {
  generate: (payload: WeeklyDigestPayload) =>
    http.post<WeeklyDigestResponse>("/api/weekly-digest", payload),
};
