// Lightweight product analytics sink.
//
// Подвійний transport:
//   1. Локальний ring-buffer (`hub_analytics_log_v1` у localStorage,
//      max 200 подій) + `console.log("[analytics]", …)` — devtools
//      і Sentry console-breadcrumbs. Працює завжди.
//   2. PostHog — якщо виставлений `VITE_POSTHOG_KEY`. Fire-and-forget
//      через `posthog.ts` (lazy dynamic import), буферизує події до
//      завершення init.
//
// Contract:
//   - `trackEvent(name, payload?)` is fire-and-forget. It never throws
//     and never returns a Promise that callers need to await.
//   - Payload is expected to be a small plain object with NO sensitive
//     data (no tokens, emails, amounts linked to a real identity, etc.).

/** @typedef {{ eventName: string, payload: object, timestamp: string }} AnalyticsEvent */

import { ANALYTICS_EVENTS } from "@sergeant/shared";
import { capturePostHogEvent } from "./posthog";

export { ANALYTICS_EVENTS };
export { initPostHog, identifyPostHogUser, resetPostHog } from "./posthog";

const LOG_KEY = "hub_analytics_log_v1";
const MAX_LOG = 200;

function safeReadLog(): unknown[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLog(events: unknown[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(events.slice(-MAX_LOG)));
  } catch {
    /* quota — ignore */
  }
}

/**
 * Record a product event. Fire-and-forget — safe to call from any UI
 * handler without awaiting.
 *
 * @param {string} eventName - Canonical event name, see `ANALYTICS_EVENTS`.
 * @param {object} [payload] - Minimal, non-sensitive metadata.
 */
export function trackEvent(eventName, payload = {}) {
  if (!eventName || typeof eventName !== "string") return;
  const event = {
    eventName,
    payload: payload && typeof payload === "object" ? payload : {},
    timestamp: new Date().toISOString(),
  };
  try {
    console.log("[analytics]", event);
    const current = safeReadLog();
    safeWriteLog([...current, event]);
    const analyticsWindow = window as Window & {
      __hubAnalytics?: unknown[];
    };
    analyticsWindow.__hubAnalytics = [...current, event].slice(-MAX_LOG);
  } catch {}
  capturePostHogEvent(eventName, event.payload as Record<string, unknown>);
}
