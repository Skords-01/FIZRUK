import { http } from "../httpClient";

export interface ChatMessage {
  role: "user" | "assistant" | string;
  content: string;
}

export interface ChatRequestPayload {
  context: string;
  messages: ChatMessage[];
  tool_results?: unknown;
  tool_calls_raw?: unknown;
  stream?: boolean;
}

export interface ChatResponse {
  text?: string;
  tool_calls?: Array<{ id: string; [key: string]: unknown }>;
  tool_calls_raw?: unknown;
  error?: string;
}

export interface ChatCallOpts {
  /** Скасувати активний запит (AbortController у HubChat). */
  signal?: AbortSignal;
}

export const chatApi = {
  /** Звичайний non-streaming JSON-запит. */
  send: (payload: ChatRequestPayload, opts: ChatCallOpts = {}) =>
    http.post<ChatResponse>("/api/chat", payload, { signal: opts.signal }),
  /**
   * SSE-стрім. Повертає сирий `Response`, щоб викликач сам керував
   * `ReadableStream` (напр. через `consumeHubChatSse`). `signal` прокидуємо
   * у fetch, щоб скасування з UI перериває read loop.
   */
  stream: (payload: ChatRequestPayload, opts: ChatCallOpts = {}) =>
    http.raw("/api/chat", {
      method: "POST",
      body: payload,
      signal: opts.signal,
    }),
};
