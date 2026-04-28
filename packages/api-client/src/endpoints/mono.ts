import type { HttpClient } from "../httpClient";

/**
 * Опис полів береться з Monobank Personal API:
 * https://api.monobank.ua/docs/personal.html
 *
 * Index-signature `[key: string]: unknown` залишений як safety-net: зовнішнє
 * API періодично додає нові поля, і ми не хочемо ламати типізацію на цьому.
 */

export type MonoCashbackType = "" | "None" | "UAH" | "Miles" | string;

// ── Webhook migration DTOs (Track A) ─────────────────────────────────────

export type MonoConnectionStatus =
  | "pending"
  | "active"
  | "invalid"
  | "disconnected";

export interface MonoAccountDto {
  userId: string;
  monoAccountId: string;
  sendId: string | null;
  type: string | null;
  currencyCode: number;
  cashbackType: string | null;
  maskedPan: string[];
  iban: string | null;
  balance: number | null;
  creditLimit: number | null;
  lastSeenAt: string;
}

export interface MonoTransactionDto {
  userId: string;
  monoAccountId: string;
  monoTxId: string;
  time: string;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  mcc: number | null;
  originalMcc: number | null;
  hold: boolean | null;
  description: string | null;
  comment: string | null;
  cashbackAmount: number | null;
  commissionRate: number | null;
  balance: number | null;
  receiptId: string | null;
  invoiceId: string | null;
  counterEdrpou: string | null;
  counterIban: string | null;
  counterName: string | null;
  source: "webhook" | "backfill";
  receivedAt: string;
}

export interface MonoSyncState {
  status: MonoConnectionStatus;
  webhookActive: boolean;
  lastEventAt: string | null;
  lastBackfillAt: string | null;
  accountsCount: number;
}

/**
 * Cursor-paginated response from `GET /api/mono/transactions`. Server returns
 * up to `limit` items (default 50) ordered by `(time DESC, monoTxId DESC)`;
 * `nextCursor` is non-null when more rows are available.
 */
export interface MonoTransactionsPage {
  data: MonoTransactionDto[];
  nextCursor: string | null;
}

export interface MonoAccount {
  id: string;
  sendId?: string;
  currencyCode?: number;
  cashbackType?: MonoCashbackType;
  balance?: number;
  creditLimit?: number;
  maskedPan?: string[];
  type?: string;
  iban?: string;
  [key: string]: unknown;
}

export interface MonoJar {
  id: string;
  sendId?: string;
  title?: string;
  description?: string;
  currencyCode?: number;
  balance?: number;
  goal?: number;
  [key: string]: unknown;
}

export interface MonoClientInfo {
  clientId?: string;
  name?: string;
  webHookUrl?: string;
  permissions?: string;
  accounts?: MonoAccount[];
  jars?: MonoJar[];
  [key: string]: unknown;
}

// ── Webhook API (Track A) — only mode after roadmap-A polling cleanup ──

export interface MonoWebhookEndpoints {
  connect: (
    token: string,
    opts?: { signal?: AbortSignal },
  ) => Promise<{ status: MonoConnectionStatus; accountsCount: number }>;
  disconnect: (opts?: { signal?: AbortSignal }) => Promise<void>;
  syncState: (opts?: { signal?: AbortSignal }) => Promise<MonoSyncState>;
  accounts: (opts?: { signal?: AbortSignal }) => Promise<MonoAccountDto[]>;
  transactions: (
    params: {
      from?: string;
      to?: string;
      accountId?: string;
      limit?: number;
      cursor?: string;
    },
    opts?: { signal?: AbortSignal },
  ) => Promise<MonoTransactionsPage>;
  backfill: (opts?: { signal?: AbortSignal }) => Promise<void>;
}

export function createMonoWebhookEndpoints(
  http: HttpClient,
): MonoWebhookEndpoints {
  return {
    connect: (token, opts) =>
      http.post<{ status: MonoConnectionStatus; accountsCount: number }>(
        "/api/mono/connect",
        { token },
        { signal: opts?.signal },
      ),
    disconnect: (opts) =>
      http.post<void>("/api/mono/disconnect", undefined, {
        signal: opts?.signal,
      }),
    syncState: (opts) =>
      http.get<MonoSyncState>("/api/mono/sync-state", {
        signal: opts?.signal,
      }),
    accounts: (opts) =>
      http.get<MonoAccountDto[]>("/api/mono/accounts", {
        signal: opts?.signal,
      }),
    transactions: (params, opts) =>
      http.get<MonoTransactionsPage>("/api/mono/transactions", {
        query: params,
        signal: opts?.signal,
      }),
    backfill: (opts) =>
      http.post<void>("/api/mono/backfill", undefined, {
        signal: opts?.signal,
      }),
  };
}
