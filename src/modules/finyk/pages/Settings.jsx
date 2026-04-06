import { useState } from "react";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { SyncModal } from "../components/SyncModal";
import { getAccountLabel } from "../utils";
import { cn } from "@shared/lib/cn";

function Section({ title, children }) {
  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden shadow-card">
      <div className="px-5 pt-4 pb-2 border-b border-line">
        <div className="text-xs font-bold text-muted uppercase tracking-widest">{title}</div>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export function Settings({ mono, storage }) {
  const { accounts, token, clientInfo } = mono;
  const { hiddenAccounts, toggleHideAccount, monthlyPlan, setMonthlyPlan, exportData, importData } = storage;

  const [syncOpen, setSyncOpen] = useState(false);
  const [plan, setPlan] = useState({
    income: monthlyPlan?.income ?? "",
    expense: monthlyPlan?.expense ?? "",
    savings: monthlyPlan?.savings ?? "",
  });
  const [planSaved, setPlanSaved] = useState(false);

  const savePlan = () => {
    setMonthlyPlan(plan);
    setPlanSaved(true);
    setTimeout(() => setPlanSaved(false), 2000);
  };

  const uahAccounts = accounts.filter(a => a.currencyCode === 980);

  return (
    <div className="flex-1 overflow-y-auto">
      {syncOpen && <SyncModal storage={storage} onClose={() => setSyncOpen(false)} />}
      <div className="px-4 pt-4 pb-16 space-y-4 max-w-2xl mx-auto">

        {/* Monthly plan */}
        <Section title="📌 Місячний план">
          <p className="text-xs text-subtle -mt-1">Використовується для розрахунку Пульсу та Плану/Факту</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-subtle mb-1.5">Дохід ₴</div>
              <Input
                type="number"
                placeholder="0"
                value={plan.income}
                onChange={e => setPlan(p => ({ ...p, income: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs text-subtle mb-1.5">Витрати ₴</div>
              <Input
                type="number"
                placeholder="0"
                value={plan.expense}
                onChange={e => setPlan(p => ({ ...p, expense: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs text-subtle mb-1.5">Заощадж. ₴</div>
              <Input
                type="number"
                placeholder="0"
                value={plan.savings}
                onChange={e => setPlan(p => ({ ...p, savings: e.target.value }))}
              />
            </div>
          </div>
          <Button
            className={cn("w-full transition-all", planSaved && "bg-success border-success")}
            onClick={savePlan}
          >
            {planSaved ? "✓ Збережено" : "Зберегти план"}
          </Button>
        </Section>

        {/* Accounts */}
        {uahAccounts.length > 0 && (
          <Section title="💳 Рахунки">
            <p className="text-xs text-subtle -mt-1">Сховані рахунки не враховуються у балансі та нетворсі</p>
            <div className="space-y-0 -mx-4">
              {uahAccounts.map(acc => {
                const hidden = hiddenAccounts.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{getAccountLabel(acc)}</div>
                      <div className="text-xs text-subtle mt-0.5 tabular-nums">
                        {(acc.balance / 100).toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴
                        {acc.creditLimit > 0 && ` · ліміт ${(acc.creditLimit / 100).toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴`}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleHideAccount(acc.id)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-xl border font-semibold transition-colors",
                        hidden
                          ? "border-subtle/50 text-subtle hover:border-muted hover:text-text"
                          : "border-success/40 text-success hover:border-danger/40 hover:text-danger"
                      )}
                    >
                      {hidden ? "Сховано" : "Видно"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Profile */}
        {clientInfo && (
          <Section title="👤 Профіль Monobank">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-panelHi border border-line flex items-center justify-center text-xl">
                {clientInfo.name?.charAt(0) || "?"}
              </div>
              <div>
                <div className="text-sm font-semibold">{clientInfo.name}</div>
                <div className="text-xs text-subtle mt-0.5">{uahAccounts.length} UAH рахунків</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-bg rounded-xl border border-line">
              <span className="text-xs text-subtle font-mono flex-1 truncate">
                {token ? token.slice(0, 8) + "••••••••••••••••••" + token.slice(-4) : "—"}
              </span>
              <button
                onClick={() => navigator.clipboard?.writeText(token).catch(() => {})}
                className="text-xs text-muted hover:text-text transition-colors shrink-0"
              >
                📋 Копіювати
              </button>
            </div>
          </Section>
        )}

        {/* Sync */}
        <Section title="🔗 Синхронізація">
          <p className="text-xs text-subtle -mt-1">Перенести налаштування на інший пристрій через посилання</p>
          <Button variant="ghost" className="w-full h-12" onClick={() => setSyncOpen(true)}>
            📤 Sync між пристроями
          </Button>
        </Section>

        {/* Data */}
        <Section title="💾 Дані">
          <p className="text-xs text-subtle -mt-1">Бекап включає всі налаштування, борги, підписки та бюджети</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={exportData} className="h-12">
              💾 Експорт JSON
            </Button>
            <label className={cn(
              "flex items-center justify-center h-12 rounded-2xl border border-line text-sm font-semibold text-muted",
              "cursor-pointer hover:bg-panelHi hover:text-text transition-colors"
            )}>
              📥 Імпорт JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) importData(e.target.files[0]); }}
              />
            </label>
          </div>
        </Section>

        {/* About */}
        <div className="text-center text-xs text-subtle pb-2">
          <div className="text-2xl mb-2">💳</div>
          <div className="font-bold text-muted">ФІНІК</div>
          <div className="mt-1">Персональний фінансист</div>
        </div>
      </div>
    </div>
  );
}
