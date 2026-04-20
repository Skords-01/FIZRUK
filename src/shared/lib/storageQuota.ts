/**
 * Minimal localStorage quota guard.
 * Goal: avoid "silent" data loss on QuotaExceededError and prevent writing very large payloads.
 */
import { STORAGE_WRITE_ERROR_EVENT } from "./storage";
import type { StorageWriteErrorDetail } from "./storage";

export const DEFAULT_MAX_BYTES = 4_000_000; // ~4MB safety (varies by browser)

function emitQuotaWriteError(
  key: string,
  reason: "too_large" | "exception",
  err?: unknown,
  bytes?: number,
  maxBytes?: number,
): void {
  try {
    const message =
      reason === "too_large"
        ? `payload ${bytes ?? "?"}B exceeds ${maxBytes ?? "?"}B limit`
        : err instanceof Error
          ? err.message
          : "unknown";
    window.dispatchEvent(
      new CustomEvent<StorageWriteErrorDetail>(STORAGE_WRITE_ERROR_EVENT, {
        detail: { key, op: "write", message },
      }),
    );
  } catch {
    /* dispatchEvent can throw in exotic embeddings — ignore */
  }
}

export interface SafeSetOptions {
  maxBytes?: number;
}

export interface SafeSetResult {
  ok: boolean;
  bytes?: number;
  maxBytes?: number;
  reason?: "too_large" | "exception";
  error?: unknown;
}

export function estimateUtf8Bytes(str: unknown): number {
  try {
    return new Blob([String(str || "")]).size;
  } catch {
    return String(str || "").length;
  }
}

export function safeSetItem(
  key: string,
  value: unknown,
  { maxBytes = DEFAULT_MAX_BYTES }: SafeSetOptions = {},
): SafeSetResult {
  try {
    const s = String(value ?? "");
    const bytes = estimateUtf8Bytes(s);
    if (maxBytes && bytes > maxBytes) {
      emitQuotaWriteError(String(key), "too_large", undefined, bytes, maxBytes);
      return { ok: false, reason: "too_large", bytes, maxBytes };
    }
    localStorage.setItem(String(key), s);
    return { ok: true, bytes };
  } catch (e) {
    emitQuotaWriteError(String(key), "exception", e);
    return { ok: false, reason: "exception", error: e };
  }
}

export function safeJsonSet(
  key: string,
  obj: unknown,
  { maxBytes = DEFAULT_MAX_BYTES }: SafeSetOptions = {},
): SafeSetResult {
  try {
    const s = JSON.stringify(obj ?? null);
    return safeSetItem(key, s, { maxBytes });
  } catch (e) {
    emitQuotaWriteError(String(key), "exception", e);
    return { ok: false, reason: "exception", error: e };
  }
}
