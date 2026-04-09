import { Button } from "@shared/components/ui/Button";
import { cn } from "@shared/lib/cn";
import { useEffect, useMemo, useState } from "react";
import { WeeklyVolumeChart } from "../components/WeeklyVolumeChart";
import { useExerciseCatalog } from "../hooks/useExerciseCatalog";
import { useRecovery } from "../hooks/useRecovery";
import { useWorkoutTemplates } from "../hooks/useWorkoutTemplates";
import { useWorkouts } from "../hooks/useWorkouts";
import { BodyAtlas } from "../components/BodyAtlas";
import { recoveryConflictsForExercise } from "../lib/recoveryConflict";
import {
  completedWorkoutsCount,
  countCompletedInCurrentWeek,
  formatCompactKg,
  personalRecordsExerciseCount,
  totalCompletedVolumeKg,
  weeklyVolumeSeriesNow,
  workoutDurationSec,
  workoutTonnageKg,
} from "../lib/workoutStats";

const SELECTED_TEMPLATE_KEY = "fizruk_selected_template_id_v1";

function formatDurShort(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s} с`;
  return `${m} хв ${s} с`;
}

function relDayLabel(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const now = new Date();
  const d = new Date(t);
  const DAY = 24 * 60 * 60 * 1000;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((a - b) / DAY);
  if (diff === 0) return "Сьогодні";
  if (diff === 1) return "Вчора";
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
}

function workoutLineTitle(w) {
  const names = (w.items || []).map(it => it.nameUk).filter(Boolean);
  if (names.length) return `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`;
  return "Тренування";
}

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

  const weekly = useMemo(() => weeklyVolumeSeriesNow(workouts), [workouts]);

  const dashMetrics = useMemo(() => ({
    total: completedWorkoutsCount(workouts),
    week: countCompletedInCurrentWeek(workouts),
    volume: totalCompletedVolumeKg(workouts),
    pr: personalRecordsExerciseCount(workouts),
  }), [workouts]);

  const recentDone = useMemo(
    () => (workouts || []).filter(w => w.endedAt).slice(0, 5),
    [workouts],
  );

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

  const kpi = [
    {
      id: "total",
      label: "Всього тренувань",
      value: String(dashMetrics.total),
      sub: "завершених",
      icon: "dumbbell",
    },
    {
      id: "week",
      label: "Цього тижня",
      value: String(dashMetrics.week),
      sub: streakDays > 0 ? `${streakDays} дн поспіль` : "поточний тиждень",
      icon: "flame",
    },
    {
      id: "vol",
      label: "Загальний обʼєм",
      value: `${formatCompactKg(dashMetrics.volume)}`,
      sub: "кг × повторення",
      icon: "chart",
    },
    {
      id: "pr",
      label: "Рекорди (вправи)",
      value: String(dashMetrics.pr),
      sub: "за оцінкою 1ПМ",
      icon: "trophy",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-16 space-y-4">

        <section
          className="rounded-3xl border border-line bg-gradient-to-br from-panel via-panel to-panelHi p-5 shadow-float"
          aria-label="Огляд Фізрука"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-success/12 flex items-center justify-center text-success" aria-hidden>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-subtle capitalize">{today}</div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight mt-0.5">Фізрук</h1>
                <p className="text-sm text-muted mt-0.5">Відновлення, план і статистика в одному місці</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
              <Button
                className="w-full sm:w-auto min-h-[48px] shrink-0 !bg-success !text-white hover:!bg-success/90 border-0 shadow-md font-semibold"
                onClick={onClickStartPlan}
                disabled={!plan.picked.length}
                aria-label="Почати тренування за планом"
              >
                + Почати тренування
              </Button>
              <Button
                variant="ghost"
                className="w-full sm:w-auto min-h-[48px]"
                onClick={() => { window.location.hash = "#workouts"; }}
                aria-label="Відкрити журнал тренувань"
              >
                Журнал
              </Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="list" aria-label="Ключові показники">
          {kpi.map(card => (
            <div
              key={card.id}
              role="listitem"
              className="bg-panel border border-line/60 rounded-2xl p-4 shadow-card min-h-[100px]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-2xl font-extrabold text-text tabular-nums leading-none">{card.value}</div>
                  <div className="text-2xs font-semibold text-subtle uppercase tracking-wide mt-2">{card.label}</div>
                  <div className="text-[9px] text-muted mt-0.5 leading-snug">{card.sub}</div>
                </div>
                <div
                  className="shrink-0 w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success"
                  aria-hidden
                >
                  {card.icon === "dumbbell" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" />
                    </svg>
                  )}
                  {card.icon === "flame" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.5-.5-3-1.5-4.5 2 2.5 2.5 5 1.5 7.5-1 2.5-3 4-5.5 4-3 0-5-2.5-5-5.5 0-3 2-5.5 5-7 0 3 1 5.5 3 7.5z" />
                    </svg>
                  )}
                  {card.icon === "chart" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="M7 12l4-4 4 4 5-6" />
                    </svg>
                  )}
                  {card.icon === "trophy" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
                      <path d="M7 8H5a2 2 0 0 1-2-2V4h4M17 8h2a2 2 0 0 0 2-2V4h-4" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
            <WeeklyVolumeChart volumeKg={weekly.volumeKg} />
          </div>
          <div className="lg:col-span-1 bg-panel border border-line/60 rounded-2xl p-5 shadow-card flex flex-col min-h-[220px]">
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-muted shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <h2 className="text-sm font-bold text-text">Останні тренування</h2>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
              {recentDone.length === 0 ? (
                <p className="text-xs text-subtle py-4 text-center leading-relaxed">Ще немає завершених тренувань — заверши сесію в журналі</p>
              ) : (
                recentDone.map(w => {
                  const ton = workoutTonnageKg(w);
                  const dur = workoutDurationSec(w);
                  return (
                    <div
                      key={w.id}
                      className="flex items-start gap-2 rounded-xl border border-line/80 bg-panelHi/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-text line-clamp-2">{workoutLineTitle(w)}</div>
                        <div className="text-2xs text-subtle mt-1">
                          {relDayLabel(w.startedAt)}
                          {" · "}
                          {formatDurShort(dur)}
                          {ton > 0 ? ` · ${Math.round(ton)} кг×повт` : ""}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 min-h-[40px] px-3 text-xs"
                        onClick={() => { window.location.hash = "#workouts"; }}
                        aria-label={`Журнал: ${workoutLineTitle(w)}`}
                      >
                        Журнал
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
