import { randomUUID } from "crypto";
import helmet from "helmet";
import { rateLimitExpress } from "./api/lib/rateLimit.js";

/** Клієнт може передати X-Request-Id; інакше генеруємо UUID. */
export function requestIdMiddleware(req, res, next) {
  const incoming = req.get("x-request-id")?.trim();
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

/** Один рядок JSON на відповідь — зручно для Railway / grep. */
export function requestLogMiddleware(req, res, next) {
  const url = req.originalUrl || "";
  if (url.startsWith("/assets/")) return next();

  const start = Date.now();
  res.on("finish", () => {
    const path = url.split("?")[0];
    const line = {
      level: "info",
      msg: "http",
      requestId: req.requestId,
      method: req.method,
      path,
      status: res.statusCode,
      ms: Date.now() - start,
    };
    console.log(JSON.stringify(line));
  });
  next();
}

/** JSON API: без CSP; CORP cross-origin щоб fetch з іншого домену (Vercel → Railway) не ламався. */
export function apiHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}

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

export function createHealthHandler(pool) {
  return async (_req, res) => {
    let dbOk = false;
    try {
      await pool.query("SELECT 1");
      dbOk = true;
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "health_db_ping",
          error: e?.message || String(e),
        }),
      );
    }
    if (dbOk) {
      res.status(200).type("text/plain").send("ok");
    } else {
      res.status(503).type("text/plain").send("unhealthy");
    }
  };
}
