import { Router } from "express";
import { asyncHandler } from "../../http/index.js";
import { anthropicMessages } from "../../lib/anthropic.js";
import { maskPii } from "../../lib/pii-mask.js";
import { env } from "../../env.js";

const CATEGORIES = [
  "groceries",
  "transport",
  "dining",
  "entertainment",
  "utilities",
  "health",
  "shopping",
  "education",
  "subscriptions",
  "income",
  "transfer",
  "other",
] as const;

type Category = (typeof CATEGORIES)[number];

interface CategorizeBody {
  description: string;
  amount?: number;
  mcc?: number;
}

interface CategorizeResult {
  category: Category;
  confidence: number;
}

function parseCategory(raw: string): CategorizeResult {
  const text = raw
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```/g, "")
    .trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { category: "other", confidence: 0 };
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const category = CATEGORIES.includes(parsed.category as Category)
      ? (parsed.category as Category)
      : "other";
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0;
    return { category, confidence };
  } catch {
    return { category: "other", confidence: 0 };
  }
}

export function createCategorizeInternalRouter(): Router {
  const r = Router();

  r.post(
    "/api/internal/categorize",
    asyncHandler(async (req, res) => {
      const { description, amount, mcc } = req.body as CategorizeBody;
      if (!description) {
        res.status(400).json({ error: "description is required" });
        return;
      }

      const safeDescription = maskPii(description);
      const amountUah = amount != null ? Math.abs(amount / 100) : null;

      const userContent = [
        `Transaction: ${safeDescription}`,
        amountUah != null ? `Amount: ${amountUah.toFixed(2)} UAH` : null,
        mcc != null ? `MCC: ${mcc}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { response, data } = await anthropicMessages(
        env.ANTHROPIC_API_KEY,
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 120,
          system:
            "You are a transaction categorizer for a Ukrainian personal finance app. " +
            "Categorize the transaction into exactly one of: groceries, transport, dining, " +
            "entertainment, utilities, health, shopping, education, subscriptions, income, " +
            'transfer, other. Respond with JSON only: {"category": "<value>", "confidence": 0.0-1.0}',
          messages: [{ role: "user", content: userContent }],
        },
        { endpoint: "internal/categorize", timeoutMs: 15_000 },
      );

      if (!response?.ok) {
        res.status(502).json({ error: "AI service error" });
        return;
      }

      const text =
        (
          data as {
            content?: Array<{ type: string; text?: string }>;
          }
        ).content?.[0]?.text ?? "";

      res.json(parseCategory(text));
    }),
  );

  return r;
}
