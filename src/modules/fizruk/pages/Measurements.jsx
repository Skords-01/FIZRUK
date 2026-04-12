import { useState } from "react";
import { Button } from "@shared/components/ui/Button";
import { MEASURE_FIELDS, useMeasurements } from "../hooks/useMeasurements";

const inp = "w-full h-11 rounded-2xl border border-line bg-panelHi px-4 text-text outline-none focus:border-muted transition-colors";

export function Measurements() {
  const { entries, addEntry, deleteEntry } = useMeasurements();
  const [form, setForm] = useState(() => Object.fromEntries(MEASURE_FIELDS.map(f => [f.id, ""])));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-[calc(88px+env(safe-area-inset-bottom,0px))] space-y-3">
        <div className="text-sm font-semibold text-muted">Заміри</div>

        <div className="text-xs text-subtle">
          Потрібна підказка?{" "}
          <a
            href="https://www.wikihow.com/Take-Body-Measurements"
            target="_blank"
            rel="noreferrer"
            className="text-success font-semibold underline"
          >
            Як правильно робити заміри
          </a>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-4 shadow-card">
          <div className="text-xs font-bold text-subtle uppercase tracking-widest mb-3">Додати замір</div>
          <div className="grid grid-cols-2 gap-2">
            {MEASURE_FIELDS.map(f => (
              <div key={f.id} className="space-y-1">
                <div className="text-[10px] font-bold text-subtle uppercase tracking-widest px-1">
                  {f.label} · {f.unit}
                </div>
                <input
                  className={inp}
                  inputMode="decimal"
                  placeholder="—"
                  value={form[f.id]}
                  onChange={(e) => setForm(s => ({ ...s, [f.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button
              className="w-full h-12"
              onClick={() => {
                const payload = {};
                for (const f of MEASURE_FIELDS) {
                  const v = (form[f.id] || "").trim();
                  if (v) payload[f.id] = Number(v.replace(",", "."));
                }
                addEntry(payload);
                setForm(Object.fromEntries(MEASURE_FIELDS.map(f => [f.id, ""])));
              }}
            >
              Зберегти
            </Button>
          </div>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 bg-panelHi/60 border-b border-line">
            <div className="text-xs font-bold text-subtle uppercase tracking-widest">Історія</div>
          </div>
          {(entries || []).map(e => (
            <div key={e.id} className="px-4 py-3 border-b border-line last:border-0">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text">
                  {new Date(e.at).toLocaleDateString("uk-UA", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <button className="text-xs text-danger/80 hover:text-danger" onClick={() => deleteEntry(e.id)}>
                  Видалити
                </button>
              </div>
              <div className="text-xs text-subtle mt-1">
                {MEASURE_FIELDS
                  .filter(f => e[f.id] != null && e[f.id] !== "")
                  .slice(0, 4)
                  .map(f => `${f.label}: ${Number(e[f.id]).toLocaleString("uk-UA")} ${f.unit}`)
                  .join(" · ") || "—"}
              </div>
            </div>
          ))}
          {(entries || []).length === 0 && (
            <div className="p-6 text-center text-sm text-subtle">Поки замірів немає</div>
          )}
        </div>
      </div>
    </div>
  );
}
