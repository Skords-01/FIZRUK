const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const TOOLS = [
  {
    name: "change_category",
    description: "Змінити категорію транзакції. Використовуй коли користувач просить перенести транзакцію в іншу категорію.",
    input_schema: {
      type: "object",
      properties: {
        tx_id: { type: "string", description: "ID транзакції з блоку [Останні операції]" },
        category_id: { type: "string", description: "ID категорії з блоку [Категорії]" },
      },
      required: ["tx_id", "category_id"],
    },
  },
  {
    name: "create_debt",
    description: "Створити новий борг (я винен комусь).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Назва боргу або кому винен" },
        amount: { type: "number", description: "Сума боргу в грн" },
        due_date: { type: "string", description: "Дата погашення YYYY-MM-DD (опціонально)" },
        emoji: { type: "string", description: "Емодзі (опціонально, за замовчуванням 💸)" },
      },
      required: ["name", "amount"],
    },
  },
  {
    name: "create_receivable",
    description: "Додати дебіторку (мені хтось винен).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Хто винен" },
        amount: { type: "number", description: "Сума в грн" },
      },
      required: ["name", "amount"],
    },
  },
  {
    name: "hide_transaction",
    description: "Приховати транзакцію зі статистики.",
    input_schema: {
      type: "object",
      properties: {
        tx_id: { type: "string", description: "ID транзакції" },
      },
      required: ["tx_id"],
    },
  },
  {
    name: "set_budget_limit",
    description: "Встановити або змінити ліміт бюджету для категорії.",
    input_schema: {
      type: "object",
      properties: {
        category_id: { type: "string", description: "ID категорії" },
        limit: { type: "number", description: "Ліміт в грн на місяць" },
      },
      required: ["category_id", "limit"],
    },
  },
];

const SYSTEM_PREFIX = `Ти фінансовий асистент додатку "Фінік". Відповідай ТІЛЬКИ українською, стисло (2-4 речення).

ПРАВИЛА:
- Усі числа бери ВИКЛЮЧНО з блоку ДАНІ. Не вигадуй і не перераховуй.
- Якщо користувач просить змінити дані — використай відповідний tool.
- Якщо в ДАНІ чогось немає — скажи прямо.
- Транзакції мають id — використовуй їх для tool calls.
- Категорії та їх id перелічені в [Категорії].

ДАНІ:
`;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://finto-flame.vercel.app",
    "https://fizruk.vercel.app",
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set" });

  try {
    const { context = "", messages = [], tool_results, tool_calls_raw } = req.body || {};

    // Якщо є tool_results — це другий крок (після виконання дій на клієнті)
    if (tool_results && tool_calls_raw) {
      const toolResultMessages = tool_results.map(r => ({
        type: "tool_result",
        tool_use_id: r.tool_use_id,
        content: r.content,
      }));

      // Відтворюємо conversation: messages + assistant tool_use + user tool_result
      const cleaned = sanitizeMessages(messages);
      const fullMessages = [
        ...cleaned,
        { role: "assistant", content: tool_calls_raw },
        { role: "user", content: toolResultMessages },
      ];

      const response = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 400,
          system: SYSTEM_PREFIX + context,
          tools: TOOLS,
          messages: fullMessages,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data?.error?.message || "AI error" });
      }

      const text = (data?.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
      return res.status(200).json({ text: text || "Готово." });
    }

    // Перший запит — може повернути tool_use або текст
    const cleaned = sanitizeMessages(messages);
    if (cleaned.length === 0) {
      return res.status(400).json({ error: "Немає повідомлень" });
    }

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 600,
        system: SYSTEM_PREFIX + context,
        tools: TOOLS,
        messages: cleaned,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "AI error" });
    }

    const content = data?.content || [];
    const toolUses = content.filter(b => b.type === "tool_use");
    const textParts = content.filter(b => b.type === "text").map(b => b.text).join("\n");

    if (toolUses.length > 0) {
      return res.status(200).json({
        text: textParts || null,
        tool_calls: toolUses.map(t => ({ id: t.id, name: t.name, input: t.input })),
        tool_calls_raw: content,
      });
    }

    return res.status(200).json({ text: textParts || "Немає відповіді від AI." });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Помилка AI сервера" });
  }
}

function sanitizeMessages(messages) {
  const cleaned = (Array.isArray(messages) ? messages : [])
    .filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && m.content.trim())
    .slice(-12);

  // Anthropic вимагає чергування user/assistant і початок з user
  const result = [];
  for (const m of cleaned) {
    if (result.length > 0 && result[result.length - 1].role === m.role) continue;
    result.push(m);
  }
  while (result.length > 0 && result[0].role !== "user") result.shift();
  while (result.length > 0 && result[result.length - 1].role !== "user") result.pop();

  return result;
}
