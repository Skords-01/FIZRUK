import { http } from "../httpClient";

export interface ModulePushPayload {
  data: unknown;
  clientUpdatedAt: string;
}

export interface ModulePushResult {
  version?: number;
  ok?: boolean;
  error?: string;
  status?: string;
}

export interface PushAllResult {
  results?: Record<string, ModulePushResult>;
}

export interface ModulePullPayload {
  data?: unknown;
  version?: number;
  serverUpdatedAt?: string;
}

export interface PullAllResult {
  modules?: Record<string, ModulePullPayload>;
}

export const syncApi = {
  pushAll: (modules: Record<string, ModulePushPayload>) =>
    http.post<PushAllResult>("/api/sync/push-all", { modules }),
  pullAll: () => http.post<PullAllResult>("/api/sync/pull-all"),
};
