import { useEffect, useMemo, useState } from "react";
import { Button } from "@shared/components/ui/Button";
import { Input } from "@shared/components/ui/Input";
import { Sheet } from "@shared/components/ui/Sheet";
import { cn } from "@shared/lib/cn";
import { useVisualKeyboardInset } from "@sergeant/shared";

/**
 * Two-step launcher for a new workout. Replaces the old standalone
 * "Тренування за шаблоном" tile + immediate "Почати тренування" CTA
 * combo on the Workouts landing.
 *
 *   step "choose" — user picks the path:
 *     • "За шаблоном"     → caller routes to the templates view.
 *     • "Підібрати вправи" → switches to step "pick".
 *
 *   step "pick"   — user multi-selects from the catalogue and confirms.
 *     The session (and its timer) is created by the caller only after
 *     `onConfirmExercises` fires, so the timer never starts before the
 *     user has at least one exercise lined up.
 *
 * Header/title updates per step so screen readers announce the change.
 */

export function QuickStartSheet({
  open,
  onClose,
  exercises,
  search,
  onPickTemplate,
  onConfirmExercises,
}) {
  const [step, setStep] = useState("choose");
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const kbInsetPx = useVisualKeyboardInset(open && step === "pick");

  // Reset to the chooser whenever the sheet is reopened.
  useEffect(() => {
    if (!open) {
      setStep("choose");
      setQ("");
      setSelectedIds(new Set());
    }
  }, [open]);

  const list = useMemo(() => {
    if (step !== "pick") return [];
    return search(q).slice(0, 60);
  }, [search, q, step]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const ex of exercises || []) {
      if (ex?.id) m.set(ex.id, ex);
    }
    return m;
  }, [exercises]);

  const selectedCount = selectedIds.size;

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedCount === 0) return;
    const picks = [];
    for (const id of selectedIds) {
      const ex = byId.get(id);
      if (ex) picks.push(ex);
    }
    if (picks.length === 0) return;
    onConfirmExercises(picks);
  };

  if (step === "choose") {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="Почати тренування"
        description="Обери шаблон або підбери вправи разово — таймер запуститься після вибору."
        closeLabel="Закрити вибір"
        panelClassName="fizruk-sheet"
        zIndex={90}
      >
        <div className="grid grid-cols-1 gap-2 pb-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPickTemplate();
            }}
            className="rounded-2xl border border-line bg-panelHi p-4 text-left hover:border-muted active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                📋
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">
                  За шаблоном
                </div>
                <div className="text-xs text-subtle mt-0.5">
                  Готовий набір вправ — старт із заповненим списком.
                </div>
              </div>
              <span className="text-subtle" aria-hidden>
                ›
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStep("pick")}
            className="rounded-2xl border border-line bg-panelHi p-4 text-left hover:border-muted active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                💪
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">
                  Підібрати вправи
                </div>
                <div className="text-xs text-subtle mt-0.5">
                  Обери вправи зараз і почни — без збереження шаблону.
                </div>
              </div>
              <span className="text-subtle" aria-hidden>
                ›
              </span>
            </div>
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Підібрати вправи"
      description={
        selectedCount > 0
          ? `Обрано: ${selectedCount} · натисни «Почати», щоб запустити таймер.`
          : "Познач хоча б одну вправу — таймер запуститься після старту."
      }
      closeLabel="Закрити підбір"
      kbInsetPx={kbInsetPx}
      panelClassName="fizruk-sheet"
      zIndex={90}
      headerRight={
        <Button
          variant="ghost"
          size="sm"
          className="h-9 min-h-[44px]"
          onClick={() => setStep("choose")}
          aria-label="Повернутись до вибору способу"
        >
          ← Назад
        </Button>
      }
      footer={
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            className="h-12 min-h-[44px] sm:flex-1"
            onClick={onClose}
          >
            Скасувати
          </Button>
          <Button
            className="h-12 min-h-[44px] sm:flex-1"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
          >
            ▶︎ Почати
            {selectedCount > 0 ? ` · ${selectedCount}` : ""}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          placeholder="Пошук вправи…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Пошук вправи в каталозі"
        />

        {list.length === 0 ? (
          <div className="rounded-xl border border-line bg-panelHi p-4 text-center text-xs text-subtle">
            {q.trim()
              ? "Нічого не знайдено за цим запитом."
              : "Каталог поки що порожній."}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {list.map((ex) => {
              const id = ex.id;
              const active = selectedIds.has(id);
              const name = ex?.name?.uk || ex?.name?.en || id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-pressed={active}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 min-h-[52px] flex items-center gap-3 transition-colors",
                      active
                        ? "border-brand-500 bg-brand-500/10"
                        : "border-line bg-bg hover:border-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-bold",
                        active
                          ? "bg-brand-strong border-brand-strong text-white"
                          : "border-line text-subtle",
                      )}
                      aria-hidden
                    >
                      {active ? "✓" : ""}
                    </span>
                    <span className="text-sm text-text truncate flex-1">
                      {name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
