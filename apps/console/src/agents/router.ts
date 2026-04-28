import Anthropic from "@anthropic-ai/sdk";
import { runOpsAgent } from "./ops.js";
import { runMarketingAgent } from "./marketing.js";

export type AgentType = "ops" | "marketing" | "unknown";

/**
 * Parses the Telegram message to determine which agent should handle it.
 * Commands take priority; free-form text falls back to a cheap classifier.
 */
export function parseCommand(text: string): {
  agent: AgentType;
  query: string;
} {
  const trimmed = text.trim();

  if (trimmed.startsWith("/ops ") || trimmed === "/ops") {
    return {
      agent: "ops",
      query:
        trimmed.replace(/^\/ops\s*/, "").trim() ||
        "Show current production status.",
    };
  }
  if (trimmed.startsWith("/content ") || trimmed === "/content") {
    return {
      agent: "marketing",
      query:
        trimmed.replace(/^\/content\s*/, "").trim() ||
        "What should we post this week?",
    };
  }
  if (trimmed.startsWith("/marketing ")) {
    return {
      agent: "marketing",
      query: trimmed.replace(/^\/marketing\s*/, "").trim(),
    };
  }

  // Free-form: classify by keywords (cheap heuristic, good enough for Phase 1)
  const lower = trimmed.toLowerCase();
  const opsKeywords = [
    "error",
    "sentry",
    "stripe",
    "payment",
    "deploy",
    "crash",
    "down",
    "prod",
    "server",
    "db",
    "alert",
    "billing",
    "users",
    "помилка",
    "сервер",
    "платіж",
    "деплой",
  ];
  const mktKeywords = [
    "post",
    "tweet",
    "thread",
    "content",
    "marketing",
    "copy",
    "text",
    "пост",
    "контент",
    "маркетинг",
    "написати",
    "реліз",
    "анонс",
  ];

  const opsScore = opsKeywords.filter((k) => lower.includes(k)).length;
  const mktScore = mktKeywords.filter((k) => lower.includes(k)).length;

  if (opsScore > mktScore) return { agent: "ops", query: trimmed };
  if (mktScore > opsScore) return { agent: "marketing", query: trimmed };

  return { agent: "unknown", query: trimmed };
}

export async function dispatchToAgent(
  client: Anthropic,
  agent: AgentType,
  query: string,
): Promise<string> {
  if (agent === "ops") return runOpsAgent(client, query);
  if (agent === "marketing") return runMarketingAgent(client, query);
  return [
    "Не впевнений, який агент підходить. Використай команду:",
    "",
    "*/ops* <питання> — інфраструктура, білінг, помилки",
    "*/content* <тема> — контент, маркетинг, пости",
    "*/help* — показати всі команди",
  ].join("\n");
}
