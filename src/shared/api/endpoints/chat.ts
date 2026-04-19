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

export const chatApi = {
  /** Звичайний non-streaming JSON-запит. */
  send: (payload: ChatRequestPayload) =>
    http.post<ChatResponse>("/api/chat", payload),
  /**
   * SSE-стрім. Повертає сирий `Response`, щоб викликач сам керував
   * `ReadableStream` (напр. через `consumeHubChatSse`).
   */
  stream: (payload: ChatRequestPayload) =>
    http.raw("/api/chat", { method: "POST", body: payload }),
};
