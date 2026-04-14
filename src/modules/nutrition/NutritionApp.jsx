import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { cn } from "@shared/lib/cn";

function friendlyApiError(status, message) {
  const m = message || "";
  if (status === 500 && /ANTHROPIC|not set|key/i.test(m)) {
    return "Сервер харчування не налаштовано (немає ключа AI).";
  }
  if (status === 413) return "Занадто велике фото. Стисни/обріж і спробуй ще раз.";
  if (status === 429) return "Забагато запитів. Спробуй через хвилину.";
  if (status === 401 || status === 403) return "Доступ заборонено.";
  return m || `Помилка ${status}`;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    // Частий кейс на Vercel: /api/* перехоплено rewrite і повернувся index.html
    if (ct.includes("text/html") || /<!doctype html/i.test(raw)) {
      throw new Error(
        "API повернув HTML замість JSON (ймовірно, rewrite перехоплює /api/*).",
      );
    }
    data = { error: raw || "Некоректна відповідь сервера" };
  }
  if (!res.ok) throw new Error(friendlyApiError(res.status, data?.error));
  return data;
}

function fmtMacro(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Math.round(Number(n));
}

export default function NutritionApp() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [statusText, setStatusText] = useState("");

  const [activePage, setActivePage] = useState("products"); // products | recipes

  // ──────────────────────────────────────────────
  // Pantries (склади) + persistence
  // ──────────────────────────────────────────────
  const PANTRIES_KEY = "nutrition_pantries_v1";
  const ACTIVE_PANTRY_KEY = "nutrition_active_pantry_v1";

  const [pantries, setPantries] = useState(() =>
    loadPantries(PANTRIES_KEY, ACTIVE_PANTRY_KEY),
  );
  const [activePantryId, setActivePantryId] = useState(() =>
    loadActivePantryId(ACTIVE_PANTRY_KEY),
  );

  const activePantry = useMemo(() => {
    const arr = Array.isArray(pantries) ? pantries : [];
    return (
      arr.find((p) => p.id === activePantryId) ||
      arr[0] ||
      makeDefaultPantry()
    );
  }, [pantries, activePantryId]);

  const pantryText = activePantry?.text || "";
  const pantryItems = Array.isArray(activePantry?.items) ? activePantry.items : [];
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    persistPantries(PANTRIES_KEY, ACTIVE_PANTRY_KEY, pantries, activePantryId);
  }, [pantries, activePantryId]);

  const [prefs, setPrefs] = useState({
    goal: "balanced",
    servings: 1,
    timeMinutes: 25,
    exclude: "",
  });

  const fileRef = useRef(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoResult, setPhotoResult] = useState(null);
  const [lastPhotoPayload, setLastPhotoPayload] = useState(null);
  const [answers, setAnswers] = useState({});
  const [portionGrams, setPortionGrams] = useState("");

  const [recipes, setRecipes] = useState([]);
  const [recipesTried, setRecipesTried] = useState(false);
  const [recipesRaw, setRecipesRaw] = useState("");

  const pantrySummary = useMemo(() => {
    if (!Array.isArray(pantryItems) || pantryItems.length === 0) return "—";
    return pantryItems
      .slice(0, 12)
      .map((x) => x.name)
      .filter(Boolean)
      .join(", ");
  }, [pantryItems]);

  const effectiveItems = useMemo(() => {
    if (Array.isArray(pantryItems) && pantryItems.length > 0) return pantryItems;
    const raw = pantryText.trim();
    if (!raw) return [];
    return parseLoosePantryText(raw);
  }, [pantryItems, pantryText]);

  const upsertItem = (name) => {
    const n = normalizeFoodName(name);
    if (!n) return;
    setPantries((cur) =>
      updatePantry(cur, activePantryId, (p) => {
        const arr = Array.isArray(p.items) ? p.items : [];
        if (arr.some((x) => normalizeFoodName(x?.name) === n)) return p;
        return {
          ...p,
          items: [...arr, { name: n, qty: null, unit: null, notes: null }],
        };
      }),
    );
  };

  const removeItem = (name) => {
    const n = normalizeFoodName(name);
    if (!n) return;
    setPantries((cur) =>
      updatePantry(cur, activePantryId, (p) => ({
        ...p,
        items: (Array.isArray(p.items) ? p.items : []).filter(
          (x) => normalizeFoodName(x?.name) !== n,
        ),
      })),
    );
  };

  const applyTemplate = (id) => {
    const templates = {
      quickBreakfast: [
        "яйця",
        "йогурт",
        "банан",
        "вівсянка",
        "сир кисломолочний",
      ],
      quickLunch: ["курка", "рис", "огірок", "помідор", "оливкова олія"],
      quickFitness: ["тунець", "гречка", "яйця", "творог", "овочі"],
    };
    const list = templates[id] || [];
    setPantries((cur) =>
      updatePantry(cur, activePantryId, (p) => ({
        ...p,
        items: list.map((n) => ({ name: n, qty: null, unit: null, notes: null })),
        text: list.join(", "),
      })),
    );
  };

  const onPickPhoto = async (file) => {
    setErr("");
    setPhotoResult(null);
    if (!file) return;
    if (!/^image\//.test(file.type || "")) {
      setErr("Обери файл зображення (jpg/png/heic).");
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setErr("Фото завелике для швидкого аналізу. Обріж або стисни (≈ до 4 МБ).");
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrl(url);
    } catch {
      /* ignore */
    }
  };

  const analyzePhoto = async () => {
    setBusy(true);
    setErr("");
    setStatusText("Аналізую фото…");
    setPhotoResult(null);
    setAnswers({});
    setPortionGrams("");
    try {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Спочатку обери фото.");
      const b64 = await fileToBase64(file);
      const payload = {
        image_base64: b64,
        mime_type: file.type || "image/jpeg",
        locale: "uk-UA",
      };
      setLastPhotoPayload(payload);
      const data = await postJson("/api/nutrition/analyze-photo", payload);
      setPhotoResult(data?.result || null);
    } catch (e) {
      setErr(e?.message || "Помилка аналізу фото");
    } finally {
      setStatusText("");
      setBusy(false);
    }
  };

  const refinePhoto = async () => {
    setBusy(true);
    setErr("");
    setStatusText("Уточнюю порцію та перераховую…");
    try {
      if (!lastPhotoPayload) throw new Error("Немає вихідного фото. Спочатку зроби аналіз.");
      const questions = Array.isArray(photoResult?.questions)
        ? photoResult.questions.slice(0, 6)
        : [];
      const qna = questions
        .map((q) => ({ question: q, answer: String(answers[q] || "").trim() }))
        .filter((x) => x.answer);
      const grams = Number(String(portionGrams).replace(",", "."));
      const data = await postJson("/api/nutrition/refine-photo", {
        ...lastPhotoPayload,
        prior_result: photoResult,
        portion_grams: Number.isFinite(grams) && grams > 0 ? grams : null,
        qna,
        locale: "uk-UA",
      });
      setPhotoResult(data?.result || null);
    } catch (e) {
      setErr(e?.message || "Помилка уточнення");
    } finally {
      setStatusText("");
      setBusy(false);
    }
  };

  const parsePantry = async () => {
    setBusy(true);
    setErr("");
    setStatusText("Розбираю список…");
    try {
      if (!pantryText.trim()) throw new Error("Надиктуй/впиши список продуктів.");
      const data = await postJson("/api/nutrition/parse-pantry", {
        text: pantryText.trim(),
        locale: "uk-UA",
      });
      const next = Array.isArray(data?.items) ? data.items : [];
      // Мерджимо у склад (щоб “купив ще щось” → додалось, а не стерлось)
      setPantries((cur) =>
        updatePantry(cur, activePantryId, (p) => ({
          ...p,
          items: mergeItems(p.items, next),
        })),
      );
    } catch (e) {
      setErr(e?.message || "Помилка розбору списку");
    } finally {
      setStatusText("");
      setBusy(false);
    }
  };

  const recommendRecipes = async () => {
    setBusy(true);
    setErr("");
    setRecipes([]);
    setRecipesRaw("");
    setRecipesTried(true);
    setStatusText("Генерую рецепти…");
    try {
      const items = effectiveItems;
      if (items.length === 0) throw new Error("Дай хоча б 2–3 продукти для рецептів.");
      const data = await postJson("/api/nutrition/recommend-recipes", {
        items: items.slice(0, 40),
        preferences: {
          goal: prefs.goal,
          servings: Number(prefs.servings) || 1,
          timeMinutes: Number(prefs.timeMinutes) || 25,
          exclude: String(prefs.exclude || ""),
          locale: "uk-UA",
        },
      });
      setRecipes(Array.isArray(data?.recipes) ? data.recipes : []);
      setRecipesRaw(typeof data?.raw === "string" ? data.raw : "");
    } catch (e) {
      setErr(e?.message || "Помилка рекомендацій");
    } finally {
      setStatusText("");
      setBusy(false);
    }
  };

  useEffect(() => {
    if (photoResult && Array.isArray(photoResult.questions)) {
      setAnswers((cur) => {
        const next = { ...cur };
        photoResult.questions.slice(0, 6).forEach((q) => {
          if (next[q] == null) next[q] = "";
        });
        return next;
      });
    }
  }, [photoResult]);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-24 max-w-2xl mx-auto w-full">
      <div className="mb-5">
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-xl font-semibold text-text tracking-tight">
            Харчування
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={activePantry?.id || activePantryId || ""}
              onChange={(e) => setActivePantryId(e.target.value)}
              disabled={busy}
              className="h-9 rounded-xl bg-panel border border-line px-3 text-sm text-text outline-none focus:border-primary/60"
              aria-label="Обрати склад продуктів"
            >
              {(Array.isArray(pantries) ? pantries : []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || "Склад"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const name = prompt("Назва нового складу (напр. Дім, Робота):");
                if (!name || !String(name).trim()) return;
                const id = `p_${Date.now()}`;
                setPantries((cur) => [
                  ...(Array.isArray(cur) ? cur : []),
                  { id, name: String(name).trim(), items: [], text: "" },
                ]);
                setActivePantryId(id);
              }}
              disabled={busy}
              className="h-9 px-3 rounded-xl bg-panel border border-line text-sm text-text hover:border-muted transition-colors disabled:opacity-50"
            >
              + Склад
            </button>
          </div>
        </div>
        <p className="text-sm text-subtle mt-1">
          Фото → приблизне КБЖВ · голос/текст → інгредієнти · рецепти з порадами
        </p>

        <div className="mt-4 flex gap-2">
          {[
            { id: "products", label: "Продукти" },
            { id: "recipes", label: "Рецепти" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActivePage(t.id)}
              className={cn(
                "h-10 px-4 rounded-2xl text-sm font-semibold border transition-colors",
                activePage === t.id
                  ? "bg-primary text-white border-primary"
                  : "bg-panel text-text border-line hover:border-muted",
              )}
              disabled={busy}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(err || statusText) && (
        <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {err || statusText}
        </div>
      )}

      <div className="grid gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-text">
                Аналіз фото страви
              </div>
              <div className="text-xs text-subtle mt-0.5">
                Повертає оцінку КБЖВ і питання для уточнення порції.
              </div>
            </div>
            <button
              type="button"
              onClick={analyzePhoto}
              disabled={busy}
              className={cn(
                "shrink-0 px-4 h-10 rounded-xl text-sm font-medium",
                "bg-primary text-white hover:brightness-110 disabled:opacity-50",
              )}
            >
              Аналізувати
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
              className="block w-full text-sm text-subtle file:mr-3 file:rounded-xl file:border file:border-line file:bg-panel file:px-3 file:py-2 file:text-sm file:font-medium file:text-text hover:file:border-muted"
              aria-label="Обрати фото страви"
              disabled={busy}
            />

            {photoPreviewUrl && (
              <div className="rounded-2xl border border-line overflow-hidden bg-panel">
                <img
                  src={photoPreviewUrl}
                  alt="Обране фото"
                  className="w-full max-h-[320px] object-cover"
                />
              </div>
            )}

            {photoResult && (
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="text-sm font-semibold text-text">
                  {photoResult.dishName || "Результат"}
                </div>
                <div className="text-xs text-subtle mt-1">
                  Впевненість:{" "}
                  {photoResult.confidence != null
                    ? `${Math.round(photoResult.confidence * 100)}%`
                    : "—"}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-line bg-bg px-3 py-2">
                    <div className="text-[11px] text-subtle">Ккал</div>
                    <div className="font-semibold">
                      {fmtMacro(photoResult.macros?.kcal)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-bg px-3 py-2">
                    <div className="text-[11px] text-subtle">Б/Ж/В (г)</div>
                    <div className="font-semibold">
                      {fmtMacro(photoResult.macros?.protein_g)}/
                      {fmtMacro(photoResult.macros?.fat_g)}/
                      {fmtMacro(photoResult.macros?.carbs_g)}
                    </div>
                  </div>
                </div>

                {Array.isArray(photoResult.ingredients) &&
                  photoResult.ingredients.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-subtle mb-1">Інгредієнти</div>
                      <div className="text-sm text-text">
                        {photoResult.ingredients
                          .map((x) => x.name)
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  )}

                {Array.isArray(photoResult.questions) &&
                  photoResult.questions.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-subtle mb-1">
                        Уточнення (щоб точніше порахувати)
                      </div>
                      <ul className="list-disc pl-5 text-sm text-text space-y-1">
                        {photoResult.questions.slice(0, 3).map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>

                      <div className="mt-3 grid gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[11px] text-subtle mb-1">
                              Порція (г) якщо знаєш
                            </div>
                            <Input
                              value={portionGrams}
                              onChange={(e) => setPortionGrams(e.target.value)}
                              inputMode="decimal"
                              placeholder="напр. 320"
                              disabled={busy}
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={refinePhoto}
                              disabled={busy}
                              className={cn(
                                "w-full h-11 rounded-2xl text-sm font-semibold",
                                "bg-panel border border-line text-text hover:border-muted disabled:opacity-50",
                              )}
                            >
                              Перерахувати
                            </button>
                          </div>
                        </div>

                        {photoResult.questions.slice(0, 3).map((q) => (
                          <div key={q}>
                            <div className="text-[11px] text-subtle mb-1">{q}</div>
                            <Input
                              value={answers[q] || ""}
                              onChange={(e) =>
                                setAnswers((a) => ({ ...a, [q]: e.target.value }))
                              }
                              placeholder="твоя відповідь…"
                              disabled={busy}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </Card>

        {activePage === "products" && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">
                  Продукти ({activePantry?.name || "Склад"})
                </div>
                <div className="text-xs text-subtle mt-0.5">
                  Додавай нові покупки — воно мерджиться, не стирає попереднє.
                </div>
              </div>
              <button
                type="button"
                onClick={parsePantry}
                disabled={busy}
                className={cn(
                  "shrink-0 px-4 h-10 rounded-xl text-sm font-medium",
                  "bg-panel border border-line text-text hover:border-muted disabled:opacity-50",
                )}
              >
                Розібрати
              </button>
            </div>

            <div className="mt-3 grid gap-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { id: "quickBreakfast", label: "Швидкий сніданок" },
                  { id: "quickLunch", label: "Швидкий обід" },
                  { id: "quickFitness", label: "Фітнес" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    disabled={busy}
                    className="text-xs px-3 py-1.5 bg-panel border border-line rounded-full text-subtle hover:text-text hover:border-muted whitespace-nowrap transition-colors shrink-0 disabled:opacity-40"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Додати продукт… (напр. лосось)"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => {
                    upsertItem(newItemName);
                    setNewItemName("");
                  }}
                  disabled={busy || !newItemName.trim()}
                  className={cn(
                    "px-4 h-11 rounded-2xl text-sm font-semibold shrink-0",
                    "bg-primary text-white hover:brightness-110 disabled:opacity-50",
                  )}
                >
                  Додати
                </button>
              </div>

              <div className="flex gap-2 items-start">
                <textarea
                  value={pantryText}
                  onChange={(e) =>
                    setPantries((cur) =>
                      updatePantry(cur, activePantryId, (p) => ({
                        ...p,
                        text: e.target.value,
                      })),
                    )
                  }
                  placeholder={'Напр.: \"2 яйця, курка, рис, огірки, сир, йогурт\"'}
                  className="flex-1 min-h-[96px] rounded-2xl bg-panel border border-line px-4 py-3 text-sm text-text outline-none focus:border-primary/60 placeholder:text-subtle transition-colors"
                  disabled={busy}
                />
              </div>

              {effectiveItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {effectiveItems.slice(0, 60).map((it, idx) => (
                    <button
                      key={`${normalizeFoodName(it?.name)}_${idx}`}
                      type="button"
                      onClick={() => removeItem(it?.name)}
                      disabled={busy}
                      className="px-3 py-1.5 rounded-full bg-panel border border-line text-sm text-text hover:border-muted transition-colors"
                      title="Натисни, щоб прибрати"
                      aria-label={`Прибрати ${it?.name || "продукт"}`}
                    >
                      {it?.name || "—"}
                      {it?.qty != null && it?.unit
                        ? ` · ${it.qty} ${it.unit}`
                        : it?.qty != null
                          ? ` · ${it.qty}`
                          : ""}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs text-subtle">
                Збережено:{" "}
                <span className="text-text">
                  {pantryItems.length ? `${pantryItems.length} позицій` : "—"}
                </span>
                {pantryItems.length > 0 && (
                  <>
                    {" "}
                    · <span className="text-text">{pantrySummary}</span>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {activePage === "recipes" && (
          <Card className="p-4">
            <div className="text-sm font-semibold text-text">
              Рецепти ({activePantry?.name || "Склад"})
            </div>
            <div className="text-xs text-subtle mt-0.5">
              Рекомендації на базі продуктів зі складу. Можна вказати час, порції та “не хочу”.
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-subtle mb-1">Ціль</div>
                  <select
                    value={prefs.goal}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, goal: e.target.value }))
                    }
                    className="w-full h-11 rounded-2xl bg-panel border border-line px-4 text-sm text-text outline-none focus:border-primary/60"
                    disabled={busy}
                  >
                    <option value="balanced">Збалансовано</option>
                    <option value="high_protein">Більше білка</option>
                    <option value="low_cal">Менше калорій</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-subtle mb-1">Порції</div>
                    <Input
                      value={String(prefs.servings)}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, servings: e.target.value }))
                      }
                      inputMode="numeric"
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-subtle mb-1">Хвилин</div>
                    <Input
                      value={String(prefs.timeMinutes)}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, timeMinutes: e.target.value }))
                      }
                      inputMode="numeric"
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-subtle mb-1">
                  Не використовувати / алергени
                </div>
                <Input
                  value={prefs.exclude}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, exclude: e.target.value }))
                  }
                  placeholder="напр. арахіс, гриби"
                  disabled={busy}
                />
              </div>

              <button
                type="button"
                onClick={recommendRecipes}
                disabled={busy}
                className={cn(
                  "w-full h-11 rounded-2xl text-sm font-semibold",
                  "bg-primary text-white hover:brightness-110 disabled:opacity-50",
                )}
              >
                Запропонувати рецепти
              </button>

              {recipes.length > 0 && (
                <div className="grid gap-3">
                  {recipes.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-line bg-panel p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text">
                            {r.title || `Рецепт ${idx + 1}`}
                          </div>
                          <div className="text-xs text-subtle mt-1">
                            {r.timeMinutes ? `${r.timeMinutes} хв` : "—"} ·{" "}
                            {r.servings ? `${r.servings} порц.` : "—"}
                          </div>
                        </div>
                        {r.macros?.kcal != null && (
                          <div className="shrink-0 rounded-xl border border-line bg-bg px-3 py-2 text-xs text-subtle">
                            <div className="text-[10px] text-subtle">≈ ккал</div>
                            <div className="text-sm font-semibold text-text">
                              {fmtMacro(r.macros.kcal)}
                            </div>
                          </div>
                        )}
                      </div>

                      {Array.isArray(r.ingredients) && r.ingredients.length > 0 && (
                        <div className="mt-3 text-sm text-text">
                          <div className="text-xs text-subtle mb-1">
                            Інгредієнти
                          </div>
                          {r.ingredients.join(", ")}
                        </div>
                      )}

                      {Array.isArray(r.steps) && r.steps.length > 0 && (
                        <div className="mt-3 text-sm text-text">
                          <div className="text-xs text-subtle mb-1">Кроки</div>
                          <ol className="list-decimal pl-5 space-y-1">
                            {r.steps.slice(0, 10).map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {Array.isArray(r.tips) && r.tips.length > 0 && (
                        <div className="mt-3 text-sm text-text">
                          <div className="text-xs text-subtle mb-1">Поради</div>
                          <ul className="list-disc pl-5 space-y-1">
                            {r.tips.slice(0, 6).map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {recipesTried && !busy && recipes.length === 0 && !err && (
                <div className="rounded-2xl border border-line bg-panel p-4 text-sm text-subtle">
                  Рецептів не повернулося. Спробуй натиснути “Розібрати” або додати 2–3 базові продукти (яйця/крупа/овочі).
                  {recipesRaw && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-muted hover:text-text">
                        Показати діагностику (raw відповідь AI)
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-snug text-subtle bg-bg border border-line rounded-xl p-3 max-h-64 overflow-auto">
                        {recipesRaw}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
    reader.onload = () => {
      const s = String(reader.result || "");
      const idx = s.indexOf("base64,");
      resolve(idx >= 0 ? s.slice(idx + 7) : s);
    };
    reader.readAsDataURL(file);
  });
}

function normalizeFoodName(s) {
  const t = String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[•·]/g, ",")
    .replace(/^[,;]+|[,;]+$/g, "");
  return t;
}

function parseLoosePantryText(raw) {
  const parts = String(raw || "")
    .replace(/\n+/g, ",")
    .split(/[;,]/g)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts
    .map((p) => {
      // e.g. "2 яйця", "200 г курка", "0.5л молоко"
      const m = p.match(
        /^(\d+(?:[.,]\d+)?)\s*([a-zA-Zа-яА-ЯіїєґІЇЄҐ%]+)?\s*(.+)?$/,
      );
      if (!m) return { name: normalizeFoodName(p), qty: null, unit: null, notes: null };
      const qty = m[1] ? Number(String(m[1]).replace(",", ".")) : null;
      const unitRaw = normalizeFoodName(m[2] || "");
      const rest = normalizeFoodName(m[3] || "");
      const name = rest || normalizeFoodName(p.replace(m[0], "").trim()) || normalizeFoodName(p);
      const unit = unitRaw ? normalizeUnit(unitRaw) : null;
      return {
        name: normalizeFoodName(name),
        qty: Number.isFinite(qty) ? qty : null,
        unit,
        notes: null,
      };
    })
    .filter((x) => x.name);
}

function normalizeUnit(u) {
  const s = String(u || "").toLowerCase();
  if (["г", "гр", "грам", "грами"].includes(s)) return "г";
  if (["кг", "кілограм", "кілограми"].includes(s)) return "кг";
  if (["мл", "міл", "мілілітр"].includes(s)) return "мл";
  if (["л", "літр", "літри"].includes(s)) return "л";
  if (["шт", "штук", "штуки"].includes(s)) return "шт";
  return u;
}

function makeDefaultPantry() {
  return { id: "home", name: "Дім", items: [], text: "" };
}

function loadActivePantryId(activeKey) {
  try {
    const v = localStorage.getItem(activeKey);
    return v ? String(v) : "home";
  } catch {
    return "home";
  }
}

function loadPantries(key, activeKey) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  // Міграція: якщо є старі ключі (не було складів), підтягнемо як "Дім"
  let fallback = makeDefaultPantry();
  try {
    const oldItems = JSON.parse(localStorage.getItem("nutrition_pantry_items_v0") || "null");
    const oldText = String(localStorage.getItem("nutrition_pantry_text_v0") || "");
    if (Array.isArray(oldItems) && oldItems.length > 0) fallback.items = oldItems;
    if (oldText) fallback.text = oldText;
  } catch {}
  try {
    localStorage.setItem(activeKey, fallback.id);
  } catch {}
  return [fallback];
}

function persistPantries(key, activeKey, pantries, activeId) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.isArray(pantries) ? pantries : []));
  } catch {}
  try {
    if (activeId) localStorage.setItem(activeKey, String(activeId));
  } catch {}
}

function updatePantry(pantries, activeId, fn) {
  const arr = Array.isArray(pantries) ? pantries : [];
  const id = String(activeId || "home");
  const idx = arr.findIndex((p) => p.id === id);
  if (idx === -1) {
    const created = fn(makeDefaultPantry());
    return [created, ...arr];
  }
  const next = [...arr];
  next[idx] = fn(next[idx]);
  return next;
}

function mergeItems(oldItems, newItems) {
  const a = Array.isArray(oldItems) ? oldItems : [];
  const b = Array.isArray(newItems) ? newItems : [];
  const seen = new Set(a.map((x) => normalizeFoodName(x?.name)));
  const merged = [...a];
  for (const it of b) {
    const n = normalizeFoodName(it?.name);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    merged.push({ name: n, qty: it?.qty ?? null, unit: it?.unit ?? null, notes: it?.notes ?? null });
  }
  return merged;
}

