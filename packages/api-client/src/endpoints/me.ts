import { MeResponseSchema, type MeResponse, type User } from "@sergeant/shared";
import type { HttpClient } from "../httpClient";
import type { RequestOptions } from "../types";

export interface MeEndpoints {
  /**
   * GET /api/me — повертає публічний профіль поточного користувача.
   * Відповідь валідується `MeResponseSchema` з `@sergeant/shared`, тож
   * типізація й runtime-перевірка — з одного джерела правди.
   */
  get: (opts?: Pick<RequestOptions, "signal">) => Promise<MeResponse>;
}

export function createMeEndpoints(http: HttpClient): MeEndpoints {
  return {
    get: async ({ signal } = {}) => {
      const raw = await http.get<unknown>("/api/me", { signal });
      return MeResponseSchema.parse(raw);
    },
  };
}

export type { MeResponse, User };
