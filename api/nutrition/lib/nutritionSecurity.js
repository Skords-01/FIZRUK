function getIp(req) {
  const xf = req?.headers?.["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  const real = req?.headers?.["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return "unknown";
}

// In-memory fixed-window rate limit.
// Note: on serverless this is per-instance best-effort, але все одно ріже очевидні спайки.
const buckets = new Map();

export function checkRateLimit(req, { key, limit, windowMs }) {
  const ip = getIp(req);
  const now = Date.now();
  const k = `${key}:${ip}`;
  const cur = buckets.get(k);
  if (!cur || now - cur.startMs >= windowMs) {
    buckets.set(k, { startMs: now, count: 1 });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }
  if (cur.count >= limit) {
    return { ok: false, remaining: 0, resetMs: windowMs - (now - cur.startMs) };
  }
  cur.count += 1;
  return { ok: true, remaining: Math.max(0, limit - cur.count), resetMs: windowMs - (now - cur.startMs) };
}

export function requireNutritionTokenIfConfigured(req, res) {
  const expected = process.env.NUTRITION_API_TOKEN;
  if (!expected) return true; // token не налаштований → нічого не ламаємо
  const got = req?.headers?.["x-token"];
  if (!got || String(got) !== String(expected)) {
    res.status(401).json({ error: "Токен відсутній або невірний" });
    return false;
  }
  return true;
}

