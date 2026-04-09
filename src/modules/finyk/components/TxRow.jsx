import { useState } from "react";
import { getCategory, getIncomeCategory, fmtAmt, fmtDate } from "../utils";
import { MCC_CATEGORIES, INCOME_CATEGORIES, INTERNAL_TRANSFER_ID, CURRENCY } from "../constants";
import { cn } from "@shared/lib/cn";

const INCOME_ICONS = {
  in_salary:          "💰",
  in_freelance:       "💻",
  [INTERNAL_TRANSFER_ID]: "↔️",
  in_cashback:        "🎁",
  in_pension:         "🏛️",
  in_other:           "📥",
};

function getAccountShortName(acc) {
  if (!acc) return null;
  const typeMap = { black: "Чорна", white: "Біла", platinum: "Platinum", iron: "Iron", fop: "ФОП", yellow: "Жовта" };
  return typeMap[acc.type] || acc.type || "Рахунок";
}

export function TxRow({ tx, onClick, highlighted, onHide, hidden, overrideCatId, onCatChange, accounts, hideAmount = false }) {
  const [catPicker, setCatPicker] = useState(false);
  const isIncome = tx.amount > 0;
  const cat = isIncome
    ? getIncomeCategory(tx.description, overrideCatId)
    : getCategory(tx.description, tx.mcc, overrideCatId);
  const catIcon = isIncome
    ? (INCOME_ICONS[cat.id] || "📥")
    : cat.label.split(" ")[0];
  const catName = isIncome ? cat.label : cat.label.slice(cat.label.indexOf(" ") + 1);

  const account = accounts?.find(a => a.id === tx._accountId);
  const isCreditCard = account?.creditLimit > 0;
  const accountName = getAccountShortName(account);

  return (
    <div className={cn("border-b border-line last:border-0", highlighted && "bg-primary/5 rounded-xl border-0 my-0.5")}>
      {/* Main row */}
      <div
        className={cn(
          "flex items-center justify-between py-3",
          highlighted && "px-2",
          hidden && "opacity-35"
        )}
      >
        <div
          onClick={onClick}
          className={cn("flex items-center gap-3 flex-1 min-w-0", onClick && "cursor-pointer")}
        >
          <span className="text-xl shrink-0 leading-none">{highlighted ? "✅" : catIcon}</span>
          <div className="min-w-0">
            <div className={cn("text-sm font-medium text-text truncate", hidden && "line-through")}>
              {tx.description || "Транзакція"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs text-subtle">{catName}</span>
              {cat.id === INTERNAL_TRANSFER_ID && (
                <span className="text-[9px] bg-muted/15 text-muted px-1.5 py-0.5 rounded-full font-semibold">не в статистиці</span>
              )}
              {overrideCatId && cat.id !== INTERNAL_TRANSFER_ID && (
                <span className="text-[9px] bg-text/8 text-muted px-1.5 py-0.5 rounded-full font-semibold">змін.</span>
              )}
              {isCreditCard && (
                <span className="text-[9px] bg-danger/8 text-danger px-1.5 py-0.5 rounded-full font-semibold">💳 {accountName}</span>
              )}
              {!isCreditCard && account && (
                <span className="text-[9px] text-subtle/50 px-1 py-0.5">{accountName}</span>
              )}
              <span className="text-xs text-subtle">· {fmtDate(tx.time)}</span>
            </div>
          </div>
        </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
          <div className="text-right">
            <div className={cn("text-sm font-semibold tabular-nums", tx.amount > 0 ? "text-success" : "text-text")}>
              {hideAmount ? "••••" : fmtAmt(tx.amount, CURRENCY.UAH)}
            </div>
            {tx.currencyCode !== CURRENCY.UAH && tx.operationAmount && (
              <div className="text-[10px] text-subtle/70 tabular-nums">
                {hideAmount ? "••••" : fmtAmt(tx.operationAmount, tx.currencyCode)}
              </div>
            )}
          </div>
          {onCatChange && (
            <button
              onClick={e => { e.stopPropagation(); setCatPicker(v => !v); }}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl transition-colors",
                catPicker ? "text-primary bg-primary/8" : "text-subtle/60 hover:text-subtle hover:bg-panelHi"
              )}
              title="Змінити категорію"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {onHide && (
            <button
              onClick={e => { e.stopPropagation(); onHide(tx.id); }}
              className={cn("w-9 h-9 flex items-center justify-center rounded-xl transition-colors", hidden ? "text-success hover:bg-success/8" : "text-subtle/60 hover:text-danger hover:bg-danger/8")}
              title={hidden ? "Відновити" : "Приховати"}
            >
              {hidden
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12s4-8 9-8 9 8 9 8-4 8-9 8-9-8-9-8z"/><circle cx="12" cy="12" r="3"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              }
            </button>
          )}
        </div>
      </div>

      {/* Category picker */}
      {catPicker && (
        <div className="flex flex-wrap gap-1.5 pb-3 px-2">
          {(isIncome ? INCOME_CATEGORIES : MCC_CATEGORIES).map(c => (
            <button
              key={c.id}
              onClick={() => {
                onCatChange(tx.id, c.id === cat.id && overrideCatId ? null : c.id);
                setCatPicker(false);
              }}
              className={cn(
                "text-xs px-3 py-2 rounded-xl border transition-colors min-h-[34px]",
                c.id === cat.id
                  ? "bg-text text-white border-text"
                  : "border-line text-subtle hover:border-muted hover:text-text"
              )}
            >
              {isIncome
                ? `${INCOME_ICONS[c.id] || "📥"} ${c.label}`
                : `${c.label.split(" ")[0]} ${c.label.slice(c.label.indexOf(" ") + 1)}`
              }
            </button>
          ))}
          {overrideCatId && (
            <button
              onClick={() => { onCatChange(tx.id, null); setCatPicker(false); }}
              className="text-xs px-3 py-2 rounded-xl border border-dashed border-danger/40 text-danger/60 hover:text-danger transition-colors"
            >
              ✕ скинути
            </button>
          )}
        </div>
      )}
    </div>
  );
}
