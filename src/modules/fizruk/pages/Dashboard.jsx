import { cn } from "@shared/lib/cn";
import { useRecovery } from "../hooks/useRecovery";
import { useWorkouts } from "../hooks/useWorkouts";

function ToneDot({ status }) {
  const cls = status === "red" ? "bg-danger" : status === "yellow" ? "bg-warning" : "bg-success";
  return <span className={cn("w-2.5 h-2.5 rounded-full inline-block", cls)} />;
}

function HumanHeatmap({ toneByGroup }) {
  const tone = (g) => toneByGroup?.[g] || "green";
  const dot = (x, y, g) => {
    const s = tone(g);
    const fill = s === "red" ? "#dc2626" : s === "yellow" ? "#b45309" : "#16a34a";
    return <circle key={g} cx={x} cy={y} r="10" fill={fill} opacity="0.95" />;
  };

  return (
    <svg viewBox="0 0 240 260" className="w-full h-[220px]">
      {/* silhouette */}
      <path d="M120 26a22 22 0 1 0 0 44a22 22 0 0 0 0-44Z" fill="#e2e8f4" stroke="#cbd5e1"/>
      <path d="M70 98c8-18 28-28 50-28s42 10 50 28l16 42c3 8-1 16-9 19l-18 7v58c0 10-8 18-18 18H99c-10 0-18-8-18-18v-58l-18-7c-8-3-12-11-9-19l16-42Z" fill="#f5f7fc" stroke="#cbd5e1"/>
      <path d="M84 148l-18-7" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round"/>
      <path d="M156 148l18-7" stroke="#cbd5e1" strokeWidth="8" strokeLinecap="round"/>
      {/* dots by muscle group */}
      {dot(120, 104, "chest")}
      {dot(120, 138, "core")}
      {dot(88, 116, "arms")}
      {dot(152, 116, "arms_r")}
      {dot(120, 170, "legs")}
      {dot(120, 198, "legs2")}
      {dot(120, 152, "back")}
      {dot(120, 126, "shoulders")}
      {dot(120, 182, "glutes")}
    </svg>
  );
}

export function Dashboard() {
  const today = new Date().toLocaleDateString("uk-UA", { weekday: "long", day: "numeric", month: "long" });
  const rec = useRecovery();
  const { workouts } = useWorkouts();

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

  const toneByGroup = (() => {
    const pick = (ids) => ids
      .map(id => rec.by?.[id]?.status)
      .filter(Boolean);
    const worst = (arr) => arr.includes("red") ? "red" : arr.includes("yellow") ? "yellow" : "green";
    return {
      chest: worst(pick(["pectoralis_major", "pectoralis_minor"])),
      back: worst(pick(["latissimus_dorsi", "rhomboids", "trapezius", "erector_spinae", "upper_back"])),
      shoulders: worst(pick(["front_deltoid", "lateral_deltoid", "rear_deltoid"])),
      arms: worst(pick(["biceps", "triceps", "forearms"])),
      arms_r: worst(pick(["biceps", "triceps", "forearms"])),
      core: worst(pick(["rectus_abdominis", "obliques"])),
      glutes: worst(pick(["gluteus_maximus", "gluteus_medius"])),
      legs: worst(pick(["quadriceps", "hamstrings"])),
      legs2: worst(pick(["calves", "adductors", "abductors"])),
    };
  })();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-3">

        <div className="bg-panel border border-line rounded-3xl p-5 shadow-float">
          <div className="text-xs text-subtle capitalize">{today}</div>
          <div className="text-3xl font-bold mt-2 text-text">Привіт, тренере 💪</div>
          <div className="text-sm text-subtle mt-1">Відновлення, баланс та план на сьогодні</div>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-medium text-subtle mb-3">Статус відновлення</div>
          <HumanHeatmap toneByGroup={toneByGroup} />
          <div className="grid grid-cols-3 gap-2 -mt-2">
            <div className="text-xs text-subtle flex items-center gap-2"><ToneDot status="green" /> готово</div>
            <div className="text-xs text-subtle flex items-center gap-2"><ToneDot status="yellow" /> норм</div>
            <div className="text-xs text-subtle flex items-center gap-2"><ToneDot status="red" /> рано</div>
          </div>
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-medium text-subtle mb-3">План на сьогодні</div>
          {rec.ready?.length ? (
            <div className="space-y-2">
              {rec.ready.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-text">{m.label}</div>
                  <div className="text-xs text-subtle">{m.daysSince == null ? "—" : `${m.daysSince} дн`}</div>
                </div>
              ))}
              {rec.avoid?.length ? (
                <div className="text-xs text-warning mt-2">Уникай сьогодні: {rec.avoid.map(x => x.label).join(", ")}</div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-subtle text-center py-6">Додай перше тренування, щоб зʼявились рекомендації</div>
          )}
        </div>

        <div className="bg-panel border border-line/60 rounded-2xl p-5 shadow-card">
          <div className="text-xs font-medium text-subtle mb-3">Баланс (найбільш “забуті”)</div>
          <div className="space-y-2">
            {(rec.list || []).slice(0, 7).map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <ToneDot status={m.status} />
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
    </div>
  );
}
