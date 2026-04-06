export function Dashboard() {
  const today = new Date().toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-3">

        <div className="bg-panel border border-line rounded-3xl p-5 shadow-float">
          <div className="text-xs text-subtle capitalize">{today}</div>
          <div className="text-3xl font-bold mt-2 text-text">Привіт, тренере 💪</div>
          <div className="text-sm text-subtle mt-1">Тут буде твій денний план тренувань</div>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-medium text-subtle mb-3">Сьогоднішнє тренування</div>
          <div className="text-center py-8 text-subtle text-sm">
            Тренування ще не заплановано
          </div>
          <button className="w-full py-3 text-sm font-semibold bg-text text-white rounded-2xl hover:opacity-90 transition-opacity">
            + Додати тренування
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Тренувань", value: "0", sub: "цього місяця" },
            { label: "Серія", value: "0", sub: "днів поспіль" },
            { label: "Ціль", value: "—", sub: "не задана" },
          ].map((s, i) => (
            <div key={i} className="bg-panel border border-line/60 rounded-2xl p-3 shadow-card text-center">
              <div className="text-xl font-bold text-text">{s.value}</div>
              <div className="text-[10px] font-semibold text-subtle mt-0.5">{s.label}</div>
              <div className="text-[9px] text-subtle/60 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
