export function Progress() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16">
        <div className="text-sm font-semibold text-muted mb-4">Прогрес</div>
        <div className="bg-panel border border-line/60 rounded-2xl p-8 shadow-card text-center">
          <div className="text-3xl mb-3">📈</div>
          <div className="text-sm font-medium text-text mb-1">Даних ще немає</div>
          <div className="text-xs text-subtle">Тут буде динаміка ваги, об'ємів і результатів вправ</div>
        </div>
      </div>
    </div>
  );
}
