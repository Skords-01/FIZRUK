const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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
    const { context = "", messages = [] } = req.body || {};

    const cleaned = Array.isArray(messages)
      ? messages.filter(m => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && m.content.trim())
      : [];

    // Anthropic requires alternating user/assistant; dedupe consecutive same-role
    const alternating = [];
    for (const m of cleaned.slice(-12)) {
      if (alternating.length > 0 && alternating[alternating.length - 1].role === m.role) continue;
      alternating.push(m);
    }
    // Must start with user
    while (alternating.length > 0 && alternating[0].role !== "user") alternating.shift();
    // Must end with user
    while (alternating.length > 0 && alternating[alternating.length - 1].role !== "user") alternating.pop();

    if (alternating.length === 0) {
      return res.status(400).json({ error: "Немає повідомлень" });
    }

    const system = [
      "Ти фінансовий асистент користувача. Відповідай ТІЛЬКИ українською.",
      "",
      "ПРАВИЛА:",
      "- Відповідай стисло: 2–4 речення, без вступних фраз.",
      "- Усі числа, суми, залишки, борги — бери ВИКЛЮЧНО з блоку ДАНІ нижче.",
      "- НІКОЛИ не вигадуй, не округлюй, не перераховуй числа самостійно.",
      "- Якщо в ДАНІ чогось немає — скажи що не маєш цієї інформації.",
      "- Не повторюй дані цілком — відповідай лише на конкретне питання.",
      "",
      "ДАНІ:",
      context,
    ].join("\n");

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
        system,
        messages: alternating,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || data?.error || "AI request failed";
      return res.status(response.status).json({ error: message });
    }

    return res.status(200).json({ text: data?.content?.[0]?.text || "Немає відповіді від AI." });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Помилка AI сервера" });
  }
}
