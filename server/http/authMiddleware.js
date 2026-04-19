import { rateLimitExpress } from "../api/lib/rateLimit.js";
import { authAttemptsTotal } from "../obs/metrics.js";

/** Жорсткіший ліміт на sign-in / sign-up / reset (POST). */
export function authSensitiveRateLimit(req, res, next) {
  const url = req.originalUrl || "";
  const sensitive =
    req.method === "POST" &&
    (url.includes("/sign-in") ||
      url.includes("/sign-up") ||
      url.includes("forget-password") ||
      url.includes("reset-password"));
  if (!sensitive) return next();
  return rateLimitExpress({
    key: "api:auth:sensitive",
    limit: 20,
    windowMs: 60_000,
  })(req, res, next);
}

/**
 * Класифікує auth-ендпоінти better-auth і після відповіді інкрементує
 * `authAttemptsTotal{op,outcome}`. Ставити ПЕРЕД `authSensitiveRateLimit`
 * (і ДО `toNodeHandler(auth)`): `res.on("finish")` спрацьовує, навіть
 * коли rate-limiter короткозамикає пайплайн без `next()`, тому реєстрація
 * listener-а мусить відбутись раніше за сам limiter, щоб 429 ловились.
 */
export function authMetricsMiddleware(req, res, next) {
  if (req.method !== "POST") return next();
  const url = req.originalUrl || "";
  const op =
    (url.includes("/sign-in") && "sign_in") ||
    (url.includes("/sign-up") && "sign_up") ||
    (url.includes("forget-password") && "forget_password") ||
    (url.includes("reset-password") && "reset_password") ||
    (url.includes("/sign-out") && "signout") ||
    null;
  if (!op) return next();

  res.on("finish", () => {
    const s = res.statusCode;
    const outcome =
      s === 429
        ? "rate_limited"
        : s === 401 || s === 403
          ? "bad_credentials"
          : s >= 500
            ? "error"
            : s >= 400
              ? "invalid"
              : "ok";
    try {
      authAttemptsTotal.inc({ op, outcome });
    } catch {
      /* ignore */
    }
  });
  next();
}
