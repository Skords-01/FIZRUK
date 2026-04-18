import { http } from "../httpClient";
import type { QueryValue } from "../types";

export interface PrivatCredentials {
  merchantId: string;
  merchantToken: string;
}

/**
 * Усі виклики до Privatbank ідуть через наш проксі `/api/privat?path=…`
 * і передають `X-Privat-Id` / `X-Privat-Token` у заголовках.
 */
export const privatApi = {
  request: <T = unknown>(
    creds: PrivatCredentials,
    path: string,
    query?: Record<string, QueryValue>,
    opts?: { signal?: AbortSignal },
  ) =>
    http.get<T>("/api/privat", {
      query: { path, ...(query ?? {}) },
      headers: {
        "X-Privat-Id": creds.merchantId,
        "X-Privat-Token": creds.merchantToken,
      },
      signal: opts?.signal,
    }),
  balanceFinal: (creds: PrivatCredentials, opts?: { signal?: AbortSignal }) =>
    privatApi.request(
      creds,
      "/statements/balance/final",
      { country: "UA", showRest: "true" },
      opts,
    ),
};
