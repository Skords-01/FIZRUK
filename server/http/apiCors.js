import { setCorsHeaders } from "./cors.js";

/**
 * Global CORS middleware для всього `/api`. Раніше жило inline у
 * `server/app.js` і дублювалось у кожному handler-і через `setCorsHeaders` +
 * OPTIONS-guard; PR 4 зробив це єдиним source of truth.
 *
 * `allowHeaders` — union усіх custom-хедерів, які очікують різні домени:
 *   - `X-Token` — nutrition/monobank (proxy)
 *   - `X-Privat-Id`, `X-Privat-Token` — privatbank (proxy)
 *   - `X-Api-Secret` — internal cron/worker endpoint-и (push/send)
 *   - `Content-Type` — для POST/JSON
 * Для preflight CORS різниці немає: браузеру байдуже, що deduped union
 * ширший за те, що конкретний endpoint реально читає, — це advisory-список.
 */
const ALLOW_HEADERS =
  "Content-Type, X-Token, X-Privat-Id, X-Privat-Token, X-Api-Secret";

export function apiCorsMiddleware() {
  return (req, res, next) => {
    setCorsHeaders(res, req, {
      allowHeaders: ALLOW_HEADERS,
      methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    });
    if (req.method === "OPTIONS") return res.status(200).end();
    next();
  };
}
