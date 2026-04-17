import { getSessionUser } from "./auth.js";
import pool from "./db.js";
import { getIp } from "./api/lib/rateLimit.js";

function parseLimit(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function isAiQuotaDisabled() {
  return process.env.AI_QUOTA_DISABLED === "1";
}

function effectiveLimits() {
  if (isAiQuotaDisabled()) return { user: null, anon: null };
  return {
    user: parseLimit("AI_DAILY_USER_LIMIT", 120),
    anon: parseLimit("AI_DAILY_ANON_LIMIT", 40),
  };
}

/**
 * Перевірка та збільшення денного лічильника AI для залогіненого користувача або IP.
 * Повертає false, якщо відповідь вже відправлена (429/503).
 */
export async function assertAiQuota(req, res) {
  const { user: userLimit, anon: anonLimit } = effectiveLimits();
  const sessionUser = await getSessionUser(req);
  const limit = sessionUser ? userLimit : anonLimit;

  if (limit == null) return true;

  if (limit === 0) {
    res.status(429).json({
      error: "AI-квота вимкнена для цього типу доступу.",
      code: "AI_QUOTA",
    });
    return false;
  }

  const subject = sessionUser ? `u:${sessionUser.id}` : `ip:${getIp(req)}`;
  const day = new Date().toISOString().slice(0, 10);

  try {
    const result = await consumeQuota(subject, day, limit);
    if (!result.ok) {
      res.status(429).json({
        error: "Денний ліміт AI вичерпано. Спробуй завтра.",
        code: "AI_QUOTA",
        limit: result.limit,
      });
      return false;
    }
    try {
      res.setHeader("X-AI-Quota-Remaining", String(result.remaining));
    } catch {
      /* ignore */
    }
    return true;
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "ai_quota_db",
        error: e?.message || String(e),
      }),
    );
    res.status(503).json({
      error: "Не вдалося перевірити квоту AI. Спробуй пізніше.",
      code: "AI_QUOTA_DB",
    });
    return false;
  }
}

async function consumeQuota(subject, day, limit) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sel = await client.query(
      `SELECT request_count FROM ai_usage_daily WHERE subject_key = $1 AND usage_day = $2::date FOR UPDATE`,
      [subject, day],
    );
    const cur = sel.rows[0]?.request_count ?? 0;
    if (cur >= limit) {
      await client.query("ROLLBACK");
      return { ok: false, remaining: 0, limit };
    }
    const next = cur + 1;
    if (sel.rows.length === 0) {
      await client.query(
        `INSERT INTO ai_usage_daily (subject_key, usage_day, request_count) VALUES ($1, $2::date, 1)`,
        [subject, day],
      );
    } else {
      await client.query(
        `UPDATE ai_usage_daily SET request_count = $3 WHERE subject_key = $1 AND usage_day = $2::date`,
        [subject, day, next],
      );
    }
    await client.query("COMMIT");
    return { ok: true, remaining: limit - next, limit };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}
