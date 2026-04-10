import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useStorage } from "../modules/finyk/hooks/useStorage";
import { useMonobank } from "../modules/finyk/hooks/useMonobank";
import { getCategory, getMonoTotals, getDebtPaid, getTxStatAmount, calcCategorySpent } from "../modules/finyk/utils";
import { MCC_CATEGORIES } from "../modules/finyk/constants";
import { cn } from "@shared/lib/cn";

function getFizrukContext() {
  try {
    const raw = localStorage.getItem("fizruk_workouts_v1");
    const workouts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(workouts) || workouts.length === 0) return "";
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = workouts.filter(w => w.startedAt > weekAgo).length;
    const last = [...workouts].sort((a, b) => b.startedAt - a.startedAt)[0];
    const lastDate = last
      ? new Date(last.startedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })
      : "—";
    return `Останнє тренування: ${lastDate}\nТренувань за тиждень: ${recentCount}`;
  } catch {
    return "";
  }
}

function fmt(n) {
  return Math.round(n).toLocaleString("uk-UA");
}

function buildContext(storage, mono) {
  const {
    budgets, manualDebts, receivables, subscriptions,
    monthlyPlan, excludedTxIds, txCategories, txSplits,
    hiddenAccounts,
  } = storage;
  const { realTx, accounts, transactions, clientInfo, lastUpdated } = mono;

  const lines = [];

  const ts = lastUpdated
    ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(lastUpdated)
    : "невідомо";
  lines.push(`[Оновлено] ${ts}`);

  if (clientInfo?.name) lines.push(`[Користувач] ${clientInfo.name}`);

  if (accounts?.length > 0) {
    const { balance, debt: monoDebt } = getMonoTotals(accounts, hiddenAccounts || []);
    const manualDebtTotal = manualDebts.reduce(
      (s, d) => s + Math.max(0, d.totalAmount - getDebtPaid(d, transactions || [])), 0,
    );
    lines.push(`[Баланс карток] ${fmt(balance)} грн`);
    lines.push(`[Борг кредитки] ${fmt(monoDebt)} грн`);
    if (manualDebtTotal > 0) lines.push(`[Борг ручний] ${fmt(manualDebtTotal)} грн`);
    lines.push(`[Борг загальний] ${fmt(monoDebt + manualDebtTotal)} грн`);
  }

  if (realTx?.length > 0) {
    const statTx = realTx.filter(t => !excludedTxIds?.has(t.id));
    const spent = statTx
      .filter(t => t.amount < 0)
      .reduce((s, t) => s + getTxStatAmount(t, txSplits), 0);
    const income = statTx
      .filter(t => t.amount > 0)
      .reduce((s, t) => s + t.amount / 100, 0);

    lines.push(`[Витрати місяця] ${fmt(spent)} грн`);
    lines.push(`[Дохід місяця] ${fmt(income)} грн`);
    lines.push(`[Баланс місяця] ${fmt(income - spent)} грн`);

    const cats = MCC_CATEGORIES
      .filter(c => c.id !== "income")
      .map(c => ({ label: c.label, spent: calcCategorySpent(statTx, c.id, txCategories, txSplits) }))
      .filter(c => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 6);
    if (cats.length > 0) {
      lines.push(`[Топ категорій] ${cats.map(c => `${c.label}: ${fmt(c.spent)} грн`).join(", ")}`);
    }

    const recent = [...statTx].sort((a, b) => (b.time || 0) - (a.time || 0)).slice(0, 5);
    if (recent.length > 0) {
      lines.push(`[Останні операції] ${recent.map(t => `${t.description || "—"} ${fmt(t.amount / 100)} грн`).join("; ")}`);
    }
  }

  const debts = manualDebts.filter(d => d.totalAmount > 0);
  if (debts.length > 0) {
    lines.push(`[Деталі боргів] ${debts.map(d => {
      const rem = Math.max(0, d.totalAmount - getDebtPaid(d, transactions || []));
      return `${d.name}: залишок ${fmt(rem)} грн`;
    }).join(", ")}`);
  }

  const recv = receivables.filter(r => r.amount > 0);
  if (recv.length > 0) {
    lines.push(`[Мені винні] ${recv.map(r => `${r.name} ${fmt(r.amount)} грн`).join(", ")}`);
  }

  const limits = budgets.filter(b => b.type === "limit");
  if (limits.length > 0) {
    lines.push(`[Ліміти] ${limits.map(b => {
      const cat = MCC_CATEGORIES.find(c => c.id === b.categoryId);
      return `${cat?.label || b.categoryId}: ${fmt(b.limit)} грн`;
    }).join(", ")}`);
  }

  const goals = budgets.filter(b => b.type === "goal");
  if (goals.length > 0) {
    lines.push(`[Цілі] ${goals.map(b => `${b.name}: ${fmt(b.savedAmount || 0)}/${fmt(b.targetAmount)} грн`).join(", ")}`);
  }

  if (monthlyPlan?.income || monthlyPlan?.expense) {
    lines.push(`[Фінплан] дохід ${fmt(monthlyPlan.income || 0)} грн/міс, витрати ${fmt(monthlyPlan.expense || 0)} грн/міс`);
  }

  if (subscriptions?.length > 0) {
    lines.push(`[Підписки] ${subscriptions.map(s => s.name).join(", ")}`);
  }

  const fizruk = getFizrukContext();
  if (fizruk) lines.push(`[Тренування] ${fizruk}`);

  return lines.length > 0 ? lines.join("\n") : "Даних немає. Monobank не підключено.";
}

const QUICK = [
  "Як справи з бюджетом?",
  "Які борги маю?",
  "Скільки витратив цього місяця?",
  "Порадь щось",
  "Як мої тренування?",
];

function useSpeech(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggle = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    recRef.current = rec;
    rec.lang = "uk-UA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }, [listening, onResult, supported]);

  return { listening, toggle, supported };
}

export function HubChat({ onClose }) {
  const storage = useStorage();
  const mono = useMonobank();

  const dataReady = !!(mono.token && mono.lastUpdated && mono.transactions.length > 0);
  const dataLoading = mono.connecting || mono.loadingTx;

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing || dataLoading) return;
    setRefreshing(true);
    try { await mono.refresh(); } finally { setRefreshing(false); }
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("hub_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ role: "assistant", text: "Привіт! Запитуй про фінанси чи тренування — відповім коротко." }];
  });

  useEffect(() => {
    try { localStorage.setItem("hub_chat_history", JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const { listening, toggle: toggleMic, supported: speechSupported } = useSpeech((text) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  });

  const context = useMemo(() => buildContext(storage, mono), [
    storage.budgets, storage.manualDebts, storage.receivables,
    storage.subscriptions, storage.monthlyPlan, storage.excludedTxIds,
    storage.txCategories, storage.txSplits, storage.hiddenAccounts,
    mono.realTx, mono.accounts, mono.transactions, mono.clientInfo, mono.lastUpdated,
  ]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { role: "user", text: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const history = next
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-10);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: history.map(m => ({ role: m.role, content: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages((m) => [...m, { role: "assistant", text: data.text || "Немає відповіді." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Помилка: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", text: "Чат очищено. Чим допомогти?" }]);
    try { localStorage.removeItem("hub_chat_history"); } catch {}
  };

  const statusText = dataLoading || refreshing
    ? "Оновлення…"
    : mono.lastUpdated
      ? `Дані: ${new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit" }).format(mono.lastUpdated)}`
      : mono.token
        ? "Завантаження…"
        : "Mono не підключено";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top,0px)", paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative mt-auto flex flex-col bg-bg border-t border-line rounded-t-3xl shadow-float max-h-[92dvh]">
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-line rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-line/60">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">🤖</span>
            <div>
              <div className="text-sm font-semibold text-text">Асистент</div>
              <div className={cn("text-[10px]", dataReady ? "text-subtle" : "text-warning")}>{statusText}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing || dataLoading}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-40"
              title="Оновити дані"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing || dataLoading ? "animate-spin" : ""}>
                <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
            <button onClick={clearChat} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-danger hover:bg-danger/8 transition-colors" title="Очистити чат">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" />
              </svg>
            </button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-text hover:bg-panelHi transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex items-end gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
              {m.role === "assistant" && <span className="text-lg shrink-0 mb-0.5 leading-none">🤖</span>}
              <div className={cn(
                "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-white rounded-br-sm"
                  : "bg-panel border border-line text-text rounded-bl-sm",
              )}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-end gap-2">
              <span className="text-lg shrink-0 mb-0.5 leading-none">🤖</span>
              <div className="bg-panel border border-line rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                {[0, 0.15, 0.3].map((d, i) => (
                  <span key={i} className="w-1.5 h-1.5 bg-subtle rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex gap-2 px-4 pt-2 pb-1 overflow-x-auto scrollbar-hide shrink-0">
          {QUICK.map((q, i) => (
            <button
              key={i}
              onClick={() => send(q)}
              disabled={loading || !dataReady}
              className="text-xs px-3 py-1.5 bg-panel border border-line rounded-full text-subtle hover:text-text hover:border-muted whitespace-nowrap transition-colors shrink-0 disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 px-4 pt-2 pb-4 shrink-0">
          <input
            ref={inputRef}
            className="flex-1 bg-panel border border-line rounded-2xl px-4 py-3 text-sm text-text outline-none focus:border-primary/60 placeholder:text-subtle transition-colors"
            placeholder={dataReady ? "Запитай про фінанси або тренування…" : "Зачекай, дані завантажуються…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={!dataReady}
          />
          {speechSupported && (
            <button
              onClick={toggleMic}
              disabled={!dataReady}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all border",
                listening
                  ? "bg-danger text-white border-danger animate-pulse"
                  : "bg-panel border-line text-muted hover:text-text hover:border-muted disabled:opacity-40",
              )}
              title={listening ? "Зупинити" : "Голосовий ввід"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={listening ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
          <button
            onClick={() => send()}
            disabled={loading || !input.trim() || !dataReady}
            className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:brightness-110 transition-all disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
