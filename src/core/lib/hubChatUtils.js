// Utility functions shared across HubChat modules

export const HUB_FINYK_CACHE_EVENT = "hub-finyk-cache-updated";
export const CONTEXT_TTL_MS = 15_000;
export const CHAT_HISTORY_WRITE_DEBOUNCE_MS = 600;

export function friendlyApiError(status, message) {
  const m = message || "";
  if (status === 500 && /ANTHROPIC|not set|key/i.test(m)) {
    return "Чат на сервері не налаштовано (немає ключа AI).";
  }
  if (status === 429) return "Забагато запитів. Спробуй через хвилину.";
  if (status === 401 || status === 403) return "Доступ заборонено.";
  return m || `Помилка ${status}`;
}

export function friendlyChatError(e) {
  const msg = e?.message || String(e);
  if (/failed to fetch|network|load failed/i.test(msg)) {
    return "Немає з'єднання з мережею або сервер недоступний.";
  }
  return `Помилка: ${msg}`;
}

/** Читає SSE з /api/chat (data: {"t":"..."} / [DONE]). Рядок за рядком — стійко до часткових чанків. */
export async function consumeHubChatSse(response, onDelta) {
  const reader = response.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    for (;;) {
      const nl = buf.indexOf("\n");
      if (nl === -1) break;
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      let j;
      try {
        j = JSON.parse(raw);
      } catch {
        continue;
      }
      if (j.err) throw new Error(j.err);
      if (j.t) onDelta(j.t);
    }
  }
}

export function newMsgId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `m_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  );
}

export function makeAssistantMsg(text) {
  return { id: newMsgId(), role: "assistant", text };
}

export function makeUserMsg(text) {
  return { id: newMsgId(), role: "user", text };
}

export function normalizeStoredMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      makeAssistantMsg(
        "Привіт! Я твій особистий асистент. Запитуй про фінанси (Фінік), тренування (Фізрук), звички (Рутина) або харчування. Можу також змінювати категорії, додавати борги, відмічати звички та записувати прийоми їжі.",
      ),
    ];
  }
  return raw.map((m, i) => ({
    ...m,
    id:
      m.id ||
      `legacy_${i}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  }));
}

export function ls(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function fmt(n) {
  return Math.round(n).toLocaleString("uk-UA");
}

export function requestIdle(cb) {
  if (typeof window === "undefined") return setTimeout(cb, 0);
  if (window.requestIdleCallback) return window.requestIdleCallback(cb, { timeout: 800 });
  return setTimeout(cb, 0);
}

export function cancelIdle(id) {
  if (typeof window === "undefined") return clearTimeout(id);
  if (window.cancelIdleCallback) return window.cancelIdleCallback(id);
  return clearTimeout(id);
}

export function checkHasMonoData() {
  try {
    const c = ls("finyk_tx_cache", null);
    return !!c?.txs?.length;
  } catch {
    return false;
  }
}
