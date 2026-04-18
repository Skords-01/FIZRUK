import { http } from "../httpClient";

export const pushApi = {
  getVapidPublic: () =>
    http.get<{ publicKey: string }>("/api/push/vapid-public"),
  subscribe: (subscription: PushSubscriptionJSON) =>
    http.post<unknown>("/api/push/subscribe", subscription),
  unsubscribe: (endpoint: string) =>
    http.del<unknown>("/api/push/subscribe", { endpoint }),
};
