import { useState } from "react";
import { SubCard } from "../components/SubCard";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Button } from "@shared/components/ui/Button";
import { Icon } from "@shared/components/ui/Icon";
import { openHubModule } from "@shared/lib/hubNav";
import { notifyFinykRoutineCalendarSync } from "../hubRoutineSync";

export function AssetsSubscriptionsSection({
  subscriptions,
  setSubscriptions,
  transactions,
  setTxPicker,
}) {
  const [showSubForm, setShowSubForm] = useState(false);
  const [newSub, setNewSub] = useState<{
    name: string;
    emoji: string;
    keyword: string;
    billingDay: string | number;
    currency: string;
  }>({
    name: "",
    emoji: "📱",
    keyword: "",
    billingDay: "",
    currency: "UAH",
  });

  return (
    <div className="mb-3 space-y-0">
      {subscriptions.length > 0 && (
        <button
          type="button"
          onClick={() => openHubModule("routine", "")}
          className="w-full text-xs text-muted hover:text-text transition-colors pb-2 flex items-center justify-center gap-1.5"
        >
          <Icon name="calendar" size={14} aria-hidden />
          <span>Побачити у календарі Рутини</span>
          <Icon name="chevron-right" size={14} aria-hidden />
        </button>
      )}
      {subscriptions.map((sub, i) => (
        <SubCard
          key={sub.id}
          sub={sub}
          transactions={transactions}
          onDelete={() => {
            setSubscriptions((ss) => ss.filter((_, j) => j !== i));
            notifyFinykRoutineCalendarSync();
          }}
          onEdit={(updated) => {
            setSubscriptions((ss) =>
              ss.map((s, j) => (j === i ? { ...s, ...updated } : s)),
            );
            notifyFinykRoutineCalendarSync();
          }}
          onLinkTransactions={() => setTxPicker({ type: "sub", subId: sub.id })}
        />
      ))}
      {showSubForm ? (
        <Card variant="flat" radius="md" className="space-y-3 mt-2">
          <Input
            placeholder="Назва"
            value={newSub.name}
            onChange={(e) => setNewSub((a) => ({ ...a, name: e.target.value }))}
          />
          <Input
            placeholder="Ключове слово з транзакції"
            value={newSub.keyword}
            onChange={(e) =>
              setNewSub((a) => ({ ...a, keyword: e.target.value }))
            }
          />
          <Input
            placeholder="День списання (1-31)"
            type="number"
            min="1"
            max="31"
            value={newSub.billingDay}
            onChange={(e) =>
              setNewSub((a) => ({
                ...a,
                billingDay: Number(e.target.value),
              }))
            }
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                if (newSub.name && newSub.billingDay) {
                  setSubscriptions((ss) => [
                    ...ss,
                    { ...newSub, id: Date.now().toString() },
                  ]);
                  notifyFinykRoutineCalendarSync();
                  setNewSub({
                    name: "",
                    emoji: "📱",
                    keyword: "",
                    billingDay: "",
                    currency: "UAH",
                  });
                  setShowSubForm(false);
                }
              }}
            >
              Додати
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={() => setShowSubForm(false)}
            >
              Скасувати
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowSubForm(true)}
          className="w-full py-2.5 text-sm text-muted border border-dashed border-line rounded-xl hover:border-primary hover:text-primary transition-colors mt-2"
        >
          + Додати підписку
        </button>
      )}
    </div>
  );
}

export function revealSubscriptionForm(
  setOpen: (
    fn: (v: { subscriptions: boolean }) => { subscriptions: boolean },
  ) => void,
) {
  setOpen((v) => ({ ...v, subscriptions: true }));
}
