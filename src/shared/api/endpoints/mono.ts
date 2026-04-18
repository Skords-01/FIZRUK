import { http } from "../httpClient";

export interface MonoAccount {
  id: string;
  currencyCode?: number;
  [key: string]: unknown;
}

export interface MonoClientInfo {
  accounts?: MonoAccount[];
  [key: string]: unknown;
}

export type MonoStatementEntry = Record<string, unknown>;

export const monoApi = {
  clientInfo: (token: string, opts?: { signal?: AbortSignal }) =>
    http.get<MonoClientInfo>("/api/mono", {
      query: { path: "/personal/client-info" },
      headers: { "X-Token": token },
      signal: opts?.signal,
    }),
  statement: (
    token: string,
    accId: string,
    from: number,
    to: number,
    opts?: { signal?: AbortSignal },
  ) =>
    http.get<MonoStatementEntry[]>("/api/mono", {
      query: { path: `/personal/statement/${accId}/${from}/${to}` },
      headers: { "X-Token": token },
      signal: opts?.signal,
    }),
};
