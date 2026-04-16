import { useEffect, useRef, useState } from "react";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { cn } from "@shared/lib/cn";

const COLLAPSE_THRESHOLD = 12;
const INPUT_MODES = [
  { id: "single", label: "Продукт" },
  { id: "list", label: "Список" },
];

function InventoryCard({
  effectiveItems,
  editItemAt,
  removeItemAtOrByName,
  pantryItemsLength,
  pantrySummary,
  busy,
}) {
  const userToggledRef = useRef(false);
  const [expanded, setExpanded] = useState(effectiveItems.length <= COLLAPSE_THRESHOLD);

  useEffect(() => {
    if (userToggledRef.current) return;
    setExpanded(effectiveItems.length <= COLLAPSE_THRESHOLD);
  }, [effectiveItems.length]);

  if (effectiveItems.length === 0) return null;

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => {
          userToggledRef.current = true;
          setExpanded((v) => !v);
        }}
        className="flex items-center justify-between w-full gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform shrink-0", expanded && "rotate-90")}
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-sm font-semibold text-text">Мій склад</span>
          <span className="text-xs text-subtle font-medium">
            ({pantryItemsLength})
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 divide-y divide-line/40">
          {effectiveItems.slice(0, 60).map((it, idx) => (
            <div
              key={`${String(it?.name || idx)}_${idx}`}
              className="flex items-center gap-2 py-2 first:pt-1 group"
            >
              <button
                type="button"
                onClick={() => editItemAt(idx)}
                disabled={busy}
                className="flex-1 min-w-0 flex items-baseline gap-1.5 text-left"
                aria-label={`Редагувати ${it?.name || "продукт"}`}
              >
                <span className="text-sm font-medium text-text truncate">
                  {it?.name || "—"}
                </span>
                {(it?.qty != null || it?.unit) && (
                  <span className="text-xs text-subtle shrink-0">
                    {it?.qty != null && it?.unit
                      ? `${it.qty} ${it.unit}`
                      : it?.qty != null
                        ? `${it.qty}`
                        : it?.unit || ""}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => removeItemAtOrByName(idx, it?.name)}
                disabled={busy}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-subtle/60 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger hover:bg-danger/10 transition-all text-sm leading-none shrink-0"
                aria-label={`Прибрати ${it?.name || "продукт"}`}
                title="Прибрати"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {pantryItemsLength > 0 && (
        <div className={cn("text-xs text-subtle pt-2 border-t border-line/50", expanded ? "mt-1" : "mt-2")}>
          <span className="font-semibold text-text">
            {pantryItemsLength} позицій
          </span>
          {" · "}
          <span>{pantrySummary}</span>
        </div>
      )}
    </Card>
  );
}

export function PantryCard({
  busy,
  activePantry: _activePantry,
  parsePantry,
  newItemName,
  setNewItemName,
  upsertItem,
  pantryText,
  setPantryText,
  effectiveItems,
  editItemAt,
  removeItemAtOrByName,
  pantryItemsLength,
  pantrySummary,
}) {
  const [mode, setMode] = useState("single");

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text">Додати продукти</div>
          </div>
          <div className="flex rounded-xl bg-panelHi border border-line/50 p-0.5 shrink-0">
            {INPUT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  mode === m.id
                    ? "bg-nutrition text-white shadow-sm"
                    : "text-subtle hover:text-text",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "single" ? (
          <div className="flex gap-2 items-center">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newItemName.trim()) {
                  upsertItem(newItemName);
                  setNewItemName("");
                }
              }}
              placeholder="напр. лосось 300г"
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
                "bg-nutrition text-white hover:bg-nutrition-hover disabled:opacity-50 transition-colors",
              )}
            >
              Додати
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-start">
            <textarea
              value={pantryText}
              onChange={(e) => setPantryText(e.target.value)}
              placeholder={'напр. "2 яйця, курка 500г, рис, огірки, сир"'}
              className="flex-1 min-h-[96px] rounded-2xl bg-panel border border-line px-4 py-3 text-sm text-text outline-none focus:border-nutrition/60 placeholder:text-subtle transition-colors"
              disabled={busy}
            />
            <button
              type="button"
              onClick={parsePantry}
              disabled={busy || !pantryText.trim()}
              className={cn(
                "shrink-0 px-4 h-11 rounded-2xl text-sm font-semibold mt-0.5",
                "bg-nutrition text-white hover:bg-nutrition-hover disabled:opacity-50 transition-colors",
              )}
            >
              Розібрати
            </button>
          </div>
        )}
      </Card>

      <InventoryCard
        effectiveItems={effectiveItems}
        editItemAt={editItemAt}
        removeItemAtOrByName={removeItemAtOrByName}
        pantryItemsLength={pantryItemsLength}
        pantrySummary={pantrySummary}
        busy={busy}
      />
    </>
  );
}
