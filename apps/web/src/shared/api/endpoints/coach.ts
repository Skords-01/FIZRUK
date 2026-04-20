import { http } from "../httpClient";

export interface CoachInsightPayload {
  snapshot: unknown;
  memory: unknown;
}

export const coachApi = {
  getMemory: () => http.get<{ memory?: unknown }>("/api/coach/memory"),
  postInsight: (payload: CoachInsightPayload) =>
    http.post<{ insight?: string | null }>("/api/coach/insight", payload),
  postMemory: (payload: unknown) =>
    http.post<unknown>("/api/coach/memory", payload),
};
