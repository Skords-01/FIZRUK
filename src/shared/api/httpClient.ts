import { apiUrl } from "@shared/lib/apiUrl";
import { ApiError } from "./ApiError";
import type { QueryValue, RequestOptions } from "./types";

const JSON_MIME = "application/json";

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = apiUrl(path);
  if (!query) return base;
  const entries = Object.entries(query).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return base;
  const params = new URLSearchParams();
  for (const [k, v] of entries) params.append(k, String(v));
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${params.toString()}`;
}

function isBodylessInit(body: unknown): boolean {
  return (
    body == null ||
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
  );
}

function serializeBody(body: unknown): BodyInit | null | undefined {
  if (body == null) return undefined;
  if (isBodylessInit(body)) return body as BodyInit;
  return JSON.stringify(body);
}

function buildHeaders(opts: RequestOptions): Headers {
  const h = new Headers();
  h.set("Accept", JSON_MIME);
  // Ставимо Content-Type тільки якщо тіло — не-примітив і ми його серіалізуємо самі.
  // Для FormData/Blob браузер виставить правильний тип сам.
  if (opts.body != null && !isBodylessInit(opts.body)) {
    h.set("Content-Type", JSON_MIME);
  }
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) {
      if (v !== undefined && v !== null) h.set(k, v);
    }
  }
  return h;
}

function combineSignals(
  userSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): { signal: AbortSignal | undefined; cancel: () => void } {
  if (!timeoutMs) return { signal: userSignal, cancel: () => {} };
  const ac = new AbortController();
  const onUserAbort = () => ac.abort(userSignal?.reason);
  if (userSignal) {
    if (userSignal.aborted) ac.abort(userSignal.reason);
    else userSignal.addEventListener("abort", onUserAbort, { once: true });
  }
  const timer = setTimeout(() => ac.abort(new Error("timeout")), timeoutMs);
  return {
    signal: ac.signal,
    cancel: () => {
      clearTimeout(timer);
      userSignal?.removeEventListener("abort", onUserAbort);
    },
  };
}

function looksLikeJson(contentType: string | null, text: string): boolean {
  if (contentType && contentType.toLowerCase().includes(JSON_MIME)) return true;
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function safeParseJson(
  text: string,
  contentType: string | null,
): { body: unknown; parseFailed: boolean } {
  if (text.length === 0) return { body: null, parseFailed: false };
  if (!looksLikeJson(contentType, text)) {
    return { body: undefined, parseFailed: true };
  }
  try {
    return { body: JSON.parse(text), parseFailed: false };
  } catch {
    return { body: undefined, parseFailed: true };
  }
}

function networkMessage(cause: unknown): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Немає підключення до інтернету. Спробуй пізніше.";
  }
  const msg = cause instanceof Error ? cause.message : "";
  return msg || "Мережева помилка";
}

/**
 * Основна точка входу HTTP-клієнта.
 * Усі ендпоінт-обгортки у `endpoints/` проходять через неї.
 */
export async function request<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, opts.query);
  const { signal, cancel } = combineSignals(opts.signal, opts.timeoutMs);

  const init: RequestInit = {
    method: opts.method ?? (opts.body != null ? "POST" : "GET"),
    credentials: opts.credentials ?? "include",
    headers: buildHeaders(opts),
    body: serializeBody(opts.body),
    signal,
  };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (cause) {
    cancel();
    const name =
      cause && typeof (cause as { name?: unknown }).name === "string"
        ? (cause as { name: string }).name
        : "";
    if (name === "AbortError") {
      throw new ApiError({
        kind: "aborted",
        message: "Запит скасовано",
        url,
        cause,
      });
    }
    throw new ApiError({
      kind: "network",
      message: networkMessage(cause),
      url,
      cause,
    });
  }

  // Raw-режим: споживач сам керує body (наприклад, SSE-стрім).
  if (opts.parse === "raw") {
    cancel();
    return res as unknown as T;
  }

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch (cause) {
    cancel();
    throw new ApiError({
      kind: "network",
      message: networkMessage(cause),
      url,
      cause,
    });
  }
  cancel();

  const ct = res.headers.get("content-type");
  const { body, parseFailed } = safeParseJson(bodyText, ct);

  if (!res.ok) {
    const serverMessage =
      body && typeof body === "object"
        ? (body as { error?: unknown }).error
        : undefined;
    throw new ApiError({
      kind: "http",
      message:
        typeof serverMessage === "string" && serverMessage.length > 0
          ? serverMessage
          : `HTTP ${res.status}`,
      status: res.status,
      body,
      bodyText,
      url,
    });
  }

  if (opts.parse === "text") return bodyText as unknown as T;

  if (parseFailed) {
    throw new ApiError({
      kind: "parse",
      message: "Некоректна відповідь сервера",
      url,
      bodyText,
    });
  }

  return body as T;
}

/** Тонкий набір шорткатів. Усі мають дефолт `credentials: "include"`. */
export const http = {
  get<T = unknown>(path: string, opts?: RequestOptions): Promise<T> {
    return request<T>(path, { ...opts, method: "GET" });
  },
  post<T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    return request<T>(path, { ...opts, method: "POST", body });
  },
  put<T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    return request<T>(path, { ...opts, method: "PUT", body });
  },
  patch<T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    return request<T>(path, { ...opts, method: "PATCH", body });
  },
  del<T = unknown>(
    path: string,
    body?: unknown,
    opts?: RequestOptions,
  ): Promise<T> {
    return request<T>(path, { ...opts, method: "DELETE", body });
  },
  /** Повертає сирий `Response` — для SSE/стрімінгу. */
  raw(path: string, opts?: RequestOptions): Promise<Response> {
    return request<Response>(path, { ...opts, parse: "raw" });
  },
};
