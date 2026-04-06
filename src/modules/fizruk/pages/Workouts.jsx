export function Workouts() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
        <div className="text-sm font-semibold text-muted mb-4">Тренування</div>
        <div className="bg-panel border border-line/60 rounded-2xl p-8 shadow-card text-center">
          <div className="text-3xl mb-3">🏋️</div>
          <div className="text-sm font-medium text-text mb-1">Тренувань поки немає</div>
          <div className="text-xs text-subtle">Додай перше тренування щоб почати відстежувати прогрес</div>
          <button className="mt-5 px-6 py-2.5 text-sm font-semibold bg-text text-white rounded-2xl hover:opacity-90 transition-opacity">
            + Нове тренування
          </button>
        </div>
      </div>
    </div>
  );
}
