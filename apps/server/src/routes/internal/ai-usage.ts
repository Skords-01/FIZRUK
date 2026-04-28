import { Router } from "express";
import type { Pool } from "pg";
import { asyncHandler } from "../../http/index.js";

interface AiUsageBody {
  source: string;
  bucket?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export function createAiUsageInternalRouter({ pool }: { pool: Pool }): Router {
  const r = Router();

  r.post(
    "/api/internal/ai-usage",
    asyncHandler(async (req, res) => {
      const {
        source,
        bucket = "default",
        inputTokens = 0,
        outputTokens = 0,
      } = req.body as AiUsageBody;

      if (!source) {
        res.status(400).json({ error: "source is required" });
        return;
      }

      const totalTokens = inputTokens + outputTokens;
      const usageDay = new Date().toISOString().slice(0, 10);

      await pool.query(
        `INSERT INTO ai_usage_daily (subject_key, usage_day, bucket, tokens_used, requests_count)
         VALUES ($1, $2, $3, $4, 1)
         ON CONFLICT (subject_key, usage_day, bucket)
         DO UPDATE SET
           tokens_used    = ai_usage_daily.tokens_used    + EXCLUDED.tokens_used,
           requests_count = ai_usage_daily.requests_count + 1`,
        [`n8n:${source}`, usageDay, bucket, totalTokens],
      );

      res.json({ ok: true });
    }),
  );

  return r;
}
