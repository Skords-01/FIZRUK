import { daysUntil, fmtDate } from "../utils";
import { cn } from "@shared/lib/cn";

export function SubCard({ sub, transactions, onDelete }) {
  const lastTx = transactions.find(
    t => t.amount < 0 && sub.keyword && (t.description || "").toLowerCase().includes(sub.keyword.toLowerCase())
  );
  const days = daysUntil(sub.billingDay);
  const amount = lastTx ? Math.abs(lastTx.amount / 100) : null;
  const currency = lastTx ? (lastTx.currencyCode === 840 ? "$" : "₴") : (sub.currency === "USD" ? "$" : "₴");
  const veryClose = days <= 1;
  const soon = days <= 3;

  return (
    <div
      className={cn(
        "bg-panel border rounded-xl p-4 mb-3 flex items-center gap-3",
        veryClose ? "border-danger/50" : soon ? "border-amber-500/40" : "border-line"
      )}
    >
      <span className="text-2xl shrink-0 leading-none">{sub.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{sub.name}</div>
        <div className={cn("text-xs mt-0.5", veryClose ? "text-danger" : soon ? "text-amber-400" : "text-subtle")}>
          {veryClose ? "⚠️ Завтра" : soon ? `⏰ Через ${days} дні` : `📅 Через ${days} днів`} · {sub.billingDay}-го
        </div>
        {lastTx && <div className="text-xs text-subtle mt-0.5">Останнє: {fmtDate(lastTx.time)}</div>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {amount
          ? <div className="text-sm font-bold">{amount.toLocaleString("uk-UA", { maximumFractionDigits: 2 })}{currency}</div>
          : <div className="text-xs text-subtle">ще не списувалось</div>
        }
        <button onClick={onDelete} className="text-subtle hover:text-danger text-sm transition-colors mt-1">🗑</button>
      </div>
    </div>
  );
}
