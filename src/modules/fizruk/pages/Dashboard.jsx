import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
import { useEffect, useMemo, useState } from "react";
import { useExerciseCatalog } from "../hooks/useExerciseCatalog";
import { useRecovery } from "../hooks/useRecovery";
import { useWorkoutTemplates } from "../hooks/useWorkoutTemplates";
import { useWorkouts } from "../hooks/useWorkouts";
import { BodyAtlas } from "../components/BodyAtlas";
import { recoveryConflictsForExercise } from "../lib/recoveryConflict";

const SELECTED_TEMPLATE_KEY = "fizruk_selected_template_id_v1";

export function Dashboard({ onOpenAtlas }) {
  const today = new Date().toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });
  const rec = useRecovery();
  const { workouts, createWorkout, addItem } = useWorkouts();
  const { exercises, primaryGroupsUk, musclesUk } = useExerciseCatalog();
  const { templates } = useWorkoutTemplates();

  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
    try { return localStorage.getItem(SELECTED_TEMPLATE_KEY) || ""; } catch { return ""; }
  });
  const [planConfirmOpen, setPlanConfirmOpen] = useState(false);

  useEffect(() => {
    if (selectedTemplateId) return;
    const first = templates[0]?.id;
    if (first) {
      setSelectedTemplateId(first);
      try { localStorage.setItem(SELECTED_TEMPLATE_KEY, first); } catch {}
    }
  }, [templates, selectedTemplateId]);

  const monthCount = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return (workouts || []).filter(w => {
      const d = w.startedAt ? new Date(w.startedAt) : null;
      return d && d.getFullYear() === y && d.getMonth() === m;
    }).length;
  })();

  const streakDays = (() => {
    const days = new Set((workouts || [])
      .map(w => w.startedAt ? new Date(w.startedAt) : null)
      .filter(Boolean)
      .map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()));

    const now = new Date();
    let cur = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let s = 0;
    const DAY = 24 * 60 * 60 * 1000;
    while (days.has(cur)) {
      s += 1;
      cur -= DAY;
    }
    return s;
  })();

  const statusByMuscle = (() => {
    const map = (id) => {
      if (!id) return null;
      if (id === "pectoralis_major" || id === "pectoralis_minor") return "chest";
      if (id === "latissimus_dorsi") return "upper-back";
      if (id === "rhomboids" || id === "upper_back") return "upper-back";
      if (id === "erector_spinae") return "lower-back";
      if (id === "trapezius") return "trapezius";
      if (id === "biceps") return "biceps";
      if (id === "triceps") return "triceps";
      if (id === "forearms") return "forearm";
      if (id === "front_deltoid") return "front-deltoids";
      if (id === "rear_deltoid") return "back-deltoids";
      if (id === "rectus_abdominis") return "abs";
      if (id === "obliques") return "obliques";
      if (id === "quadriceps") return "quadriceps";
      if (id === "hamstrings") return "hamstring";
      if (id === "calves") return "calves";
      if (id === "adductors") return "adductor";
      if (id === "abductors") return "abductors";
      if (id === "gluteus_maximus" || id === "gluteus_medius") return "gluteal";
      if (id === "neck") return "neck";
      return null;
    };
    const worst = (a, b) => (a === "red" || b === "red") ? "red" : (a === "yellow" || b === "yellow") ? "yellow" : "green";
    const out = {};
    for (const m of Object.values(rec.by || {})) {
      const key = map(m.id);
      if (!key) continue;
      out[key] = out[key] ? worst(out[key], m.status) : m.status;
    }
    return out;
  })();

  const plan = useMemo(() => {
    const tpl = templates.find(t => t.id === selectedTemplateId);
    const picked = tpl
      ? tpl.exerciseIds.map(id => exercises.find(e => e.id === id)).filter(Boolean)
      : [];

    const focus = (rec.ready || []).slice(0, 4).map(m => ({ id: m.id, label: musclesUk?.[m.id] || m.label || m.id, daysSince: m.daysSince }));
    const avoid = (rec.avoid || []).slice(0, 4).map(m => ({ id: m.id, label: musclesUk?.[m.id] || m.label || m.id }));
    return { picked, focus, avoid, templateName: tpl?.name || "" };
  }, [selectedTemplateId, templates, exercises, rec.ready, rec.avoid, musclesUk]);

  const startWorkoutFromPlan = (picks) => {
    const w = createWorkout();
    for (const ex of picks) {
      const isCardio = ex.primaryGroup === "cardio";
      addItem(w.id, {
        exerciseId: ex.id,
        nameUk: ex?.name?.uk || ex?.name?.en,
        primaryGroup: ex.primaryGroup,
        musclesPrimary: ex?.muscles?.primary || [],
        musclesSecondary: ex?.muscles?.secondary || [],
        type: isCardio ? "distance" : "strength",
        sets: isCardio ? undefined : [{ weightKg: 0, reps: 0 }],
        durationSec: 0,
        distanceM: isCardio ? 0 : 0,
      });
    }
    window.location.hash = "#workouts";
  };

  const onClickStartPlan = () => {
    const picks = plan.picked;
    if (!picks.length) return;
    const risky = picks.some(ex => recoveryConflictsForExercise(ex, rec.by).hasWarning);
    if (risky) {
      setPlanConfirmOpen(true);
      return;
    }
    startWorkoutFromPlan(picks);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-3">

        <div className="bg-panel border border-line rounded-3xl p-5 shadow-float">
          <div className="text-xs text-subtle capitalize">{today}</div>
          <div className="text-3xl font-bold mt-2 text-text">Привіт, тренере 💪</div>
          <div className="text-sm text-subtle mt-1">Відновлення, баланс та план на сьогодні</div>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-subtle">Статус відновлення</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 min-h-[44px] px-4"
              onClick={() => onOpenAtlas?.()}
              aria-label="Відкрити атлас мʼязів"
            >
              Атлас
            </Button>
          </div>
          <BodyAtlas statusByMuscle={statusByMuscle} height={160} showLegend={false} />
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-medium text-subtle mb-3">План на сьогодні</div>
          <div className="rounded-2xl border border-line bg-panelHi px-3">
            <div className="text-[10px] font-bold text-subtle uppercase tracking-widest pt-2">Мій шаблон</div>
            <select
              className="w-full min-h-[44px] bg-transparent text-sm text-text outline-none"
              value={selectedTemplateId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedTemplateId(v);
                try { localStorage.setItem(SELECTED_TEMPLATE_KEY, v); } catch {}
              }}
              aria-label="Обрати збережений шаблон тренування"
            >
              {templates.length === 0 ? (
                <option value="">— немає шаблонів —</option>
              ) : (
                templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>
          </div>

          {templates.length === 0 && (
            <div className="mt-3 text-sm text-subtle text-center py-2">
              Створи шаблон у розділі{" "}
              <button
                type="button"
                className="font-semibold text-text underline"
                onClick={() => {
                  try { sessionStorage.setItem("fizruk_workouts_mode", "templates"); } catch {}
                  window.location.hash = "#workouts";
                }}
              >
                Тренування → Шаблони
              </button>
            </div>
          )}

          {!workouts?.length ? (
            <div className="text-sm text-subtle text-center py-4">Додай перше тренування, щоб статистика була точнішою</div>
          ) : null}

          <div className="mt-3 space-y-2">
            <div className="text-xs text-subtle">Фокус (готові мʼязи):</div>
            <div className="flex flex-wrap gap-2">
              {(plan.focus || []).slice(0, 4).map(m => (
                <span key={m.id} className="text-xs px-3 py-1.5 rounded-full border border-line text-muted bg-bg">
                  {m.label}{m.daysSince == null ? "" : ` · ${m.daysSince}д`}
                </span>
              ))}
              {(plan.focus || []).length === 0 && (
                <span className="text-xs text-subtle">—</span>
              )}
            </div>

            {(plan.avoid || []).length ? (
              <div className="text-xs text-warning mt-2">Уникай сьогодні: {plan.avoid.map(x => x.label).join(", ")}</div>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="text-xs text-subtle mb-2">
              Вправи з шаблону{plan.templateName ? ` «${plan.templateName}»` : ""}:
            </div>
            {plan.picked.length ? (
              <div className="space-y-2">
                {plan.picked.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    className="w-full text-left border border-line rounded-2xl p-3 min-h-[44px] bg-bg hover:bg-panelHi transition-colors"
                    onClick={() => { window.location.hash = `#exercise/${ex.id}`; }}
                  >
                    <div className="text-sm font-semibold text-text truncate">{ex?.name?.uk || ex?.name?.en}</div>
                    <div className="text-xs text-subtle mt-0.5">{primaryGroupsUk?.[ex.primaryGroup] || ex.primaryGroup}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-subtle text-center py-6">
                {templates.length ? "У шаблоні немає вправ або вправи видалені з каталогу" : "Обери або створи шаблон"}
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              className="flex-1 h-12 min-h-[44px]"
              onClick={onClickStartPlan}
              disabled={!plan.picked.length}
            >
              Стартувати тренування
            </Button>
            <Button
              variant="ghost"
              className="h-12 min-h-[44px] px-4"
              onClick={() => { window.location.hash = "#workouts"; }}
            >
              Журнал
            </Button>
          </div>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-medium text-subtle mb-3">Баланс (найбільш “забуті”)</div>
          <div className="space-y-2">
            {(rec.list || []).slice(0, 7).map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-2.5 h-2.5 rounded-full inline-block", m.status === "red" ? "bg-danger" : m.status === "yellow" ? "bg-warning" : "bg-success")} />
                  <div className="text-sm text-text truncate">{m.label}</div>
                </div>
                <div className="text-xs text-subtle shrink-0">{m.daysSince == null ? "—" : `${m.daysSince} дн`}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Тренувань", value: String(monthCount), sub: "цього місяця" },
            { label: "Серія", value: String(streakDays), sub: "днів поспіль" },
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

      {planConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="plan-confirm-title">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Закрити" onClick={() => setPlanConfirmOpen(false)} />
          <div
            className="relative w-full max-w-2xl bg-panel border-t border-line rounded-t-3xl p-5 shadow-soft"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
          >
            <div id="plan-confirm-title" className="text-lg font-extrabold text-text">Увага</div>
            <p className="text-sm text-subtle mt-2 leading-relaxed">
              У цьому шаблоні є вправи на мʼязи, які ще відновлюються. Продовжити старт тренування?
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1 h-12 min-h-[44px]" onClick={() => setPlanConfirmOpen(false)}>
                Скасувати
              </Button>
              <Button
                className="flex-1 h-12 min-h-[44px]"
                onClick={() => {
                  setPlanConfirmOpen(false);
                  startWorkoutFromPlan(plan.picked);
                }}
              >
                Продовжити
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
