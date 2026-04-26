import { useEffect, useRef, useState } from "react";
import { DebtCard } from "../components/DebtCard";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Button } from "@shared/components/ui/Button";
import { VoiceMicButton } from "@shared/components/ui/VoiceMicButton";
import { parseExpenseSpeech as parseExpenseVoice } from "@sergeant/shared";
import {
  getAccountLabel,
  getMonoDebt,
  getDebtPaid,
  calcDebtRemaining,
  getDebtEffectiveTotal,
} from "../utils";

export function AssetsLiabilitiesSection({
  monoDebtAccounts,
  monoDebtLinkedTxIds,
  manualDebts,
  setManualDebts,
  transactions,
  setTxPicker,
  initialShowDebtForm = false,
}) {
  const [showDebtForm, setShowDebtForm] = useState(initialShowDebtForm);
  const [newDebt, setNewDebt] = useState({
    name: "",
    emoji: "💸",
    totalAmount: "",
    dueDate: "",
  });
  const debtFormRef = useRef<HTMLElement | null>(null);
  const debtNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showDebtForm) return;
    const frame = requestAnimationFrame(() => {
      debtFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      try {
        debtNameInputRef.current?.focus({ preventScroll: true });
      } catch {
        debtNameInputRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [showDebtForm]);

  return (
    <div className="mb-3 space-y-0">
      {showDebtForm ? (
        <Card
          ref={debtFormRef}
          variant="finyk-soft"
          radius="md"
          className="space-y-3 mb-2"
        >
          <div>
            <div className="text-sm font-bold text-text">Новий пасив</div>
            <div className="text-xs text-muted mt-0.5">
              Кредит, борг або інше зобовʼязання.
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              ref={debtNameInputRef}
              className="flex-1"
              placeholder="Назва пасиву (кредит, борг…)"
              value={newDebt.name}
              onChange={(e) =>
                setNewDebt((a) => ({ ...a, name: e.target.value }))
              }
            />
            <VoiceMicButton
              size="md"
              label="Голосовий ввід"
              onResult={(transcript) => {
                const parsed = parseExpenseVoice(transcript);
                if (!parsed) return;
                setNewDebt((a) => ({
                  ...a,
                  name: parsed.name || a.name,
                  totalAmount:
                    parsed.amount != null
                      ? String(Math.round(parsed.amount))
                      : a.totalAmount,
                }));
              }}
            />
          </div>
          <Input
            placeholder="Загальна сума ₴"
            type="number"
            value={newDebt.totalAmount}
            onChange={(e) =>
              setNewDebt((a) => ({ ...a, totalAmount: e.target.value }))
            }
          />
          <Input
            type="date"
            value={newDebt.dueDate}
            onChange={(e) =>
              setNewDebt((a) => ({ ...a, dueDate: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                if (newDebt.name && newDebt.totalAmount) {
                  setManualDebts((ds) => [
                    ...ds,
                    {
                      ...newDebt,
                      id: Date.now().toString(),
                      totalAmount: Number(newDebt.totalAmount),
                      linkedTxIds: [],
                    },
                  ]);
                  setNewDebt({
                    name: "",
                    emoji: "💸",
                    totalAmount: "",
                    dueDate: "",
                  });
                  setShowDebtForm(false);
                }
              }}
            >
              Додати
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={() => setShowDebtForm(false)}
            >
              Скасувати
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowDebtForm(true)}
          className="w-full py-2.5 text-sm text-muted border border-dashed border-line rounded-xl hover:border-primary hover:text-primary transition-colors mb-2"
        >
          + Додати пасив
        </button>
      )}
      {monoDebtAccounts.map((a, i) => {
        const linkedIds = monoDebtLinkedTxIds[a.id] || [];
        const paidFromLinked = transactions
          .filter((t) => linkedIds.includes(t.id))
          .reduce((s, t) => s + Math.abs(t.amount / 100), 0);
        const remaining = getMonoDebt(a);
        const volatileTotal = paidFromLinked + remaining;
        return (
          <DebtCard
            key={i}
            name={getAccountLabel(a)}
            emoji="🖤"
            remaining={remaining}
            paid={paidFromLinked}
            total={volatileTotal}
            onLink={() => setTxPicker({ id: a.id, type: "monoDebt" })}
            linkedCount={linkedIds.length}
          />
        );
      })}
      {manualDebts.map((d) => (
        <DebtCard
          key={d.id}
          name={d.name}
          emoji={d.emoji}
          remaining={calcDebtRemaining(d, transactions)}
          paid={getDebtPaid(d, transactions)}
          total={getDebtEffectiveTotal(d, transactions)}
          dueDate={d.dueDate}
          onDelete={() =>
            setManualDebts((ds) => ds.filter((x) => x.id !== d.id))
          }
          onLink={() => setTxPicker({ id: d.id, type: "debt" })}
          linkedCount={d.linkedTxIds?.length || 0}
        />
      ))}
    </div>
  );
}
