import { useEffect, useRef, useState } from "react";
import { DebtCard } from "../components/DebtCard";
import { SectionHeading } from "@shared/components/ui/SectionHeading";
import { Card } from "@shared/components/ui/Card";
import { Input } from "@shared/components/ui/Input";
import { Button } from "@shared/components/ui/Button";
import { Icon } from "@shared/components/ui/Icon";
import {
  getAccountLabel,
  getRecvPaid,
  calcReceivableRemaining,
  getReceivableEffectiveTotal,
} from "../utils";

export function AssetsOwnedSection({
  accounts,
  hiddenAccounts,
  manualAssets,
  setManualAssets,
  receivables,
  setReceivables,
  transactions,
  setTxPicker,
  initialShowAssetForm = false,
}) {
  const [showAssetForm, setShowAssetForm] = useState(initialShowAssetForm);
  const [showRecvForm, setShowRecvForm] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: "",
    amount: "",
    currency: "UAH",
    emoji: "💰",
  });
  const [newRecv, setNewRecv] = useState({
    name: "",
    emoji: "👤",
    amount: "",
    note: "",
    dueDate: "",
  });
  const assetFormRef = useRef<HTMLElement | null>(null);
  const assetNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!showAssetForm) return;
    const frame = requestAnimationFrame(() => {
      assetFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      try {
        assetNameInputRef.current?.focus({ preventScroll: true });
      } catch {
        assetNameInputRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [showAssetForm]);

  return (
    <div className="mb-3 space-y-2">
      <SectionHeading as="div" size="sm" className="pt-1">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="credit-card" size={14} className="text-muted" />
          Картки Monobank
        </span>
      </SectionHeading>
      {accounts
        .filter((a) => !hiddenAccounts.includes(a.id))
        .map((a, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 px-1 border-b border-line last:border-0"
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-muted"
                aria-hidden
              >
                <Icon name="credit-card" size={16} />
              </span>
              <div>
                <div className="text-sm font-medium">{getAccountLabel(a)}</div>
                <div className="text-xs text-subtle mt-0.5">
                  {(a.balance / 100).toLocaleString("uk-UA", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {a.currencyCode === 980
                    ? "₴"
                    : a.currencyCode === 840
                      ? "$"
                      : "€"}
                </div>
              </div>
            </div>
          </div>
        ))}

      <SectionHeading as="div" size="sm" className="pt-2">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="hand-coins" size={14} className="text-success" />
          Мені винні
        </span>
      </SectionHeading>
      {receivables.map((r) => (
        <DebtCard
          key={r.id}
          name={r.name}
          emoji={r.emoji}
          remaining={calcReceivableRemaining(r, transactions)}
          paid={getRecvPaid(r, transactions)}
          total={getReceivableEffectiveTotal(r, transactions)}
          dueDate={r.dueDate}
          isReceivable
          onDelete={() =>
            setReceivables((rs) => rs.filter((x) => x.id !== r.id))
          }
          onLink={() => setTxPicker({ id: r.id, type: "recv" })}
          linkedCount={r.linkedTxIds?.length || 0}
        />
      ))}
      {showRecvForm ? (
        <Card variant="flat" radius="md" className="space-y-3">
          <Input
            placeholder="Ім'я або назва"
            value={newRecv.name}
            onChange={(e) =>
              setNewRecv((a) => ({ ...a, name: e.target.value }))
            }
          />
          <Input
            placeholder="Сума ₴"
            type="number"
            value={newRecv.amount}
            onChange={(e) =>
              setNewRecv((a) => ({ ...a, amount: e.target.value }))
            }
          />
          <Input
            placeholder="Нотатка (необов'язково)"
            value={newRecv.note}
            onChange={(e) =>
              setNewRecv((a) => ({ ...a, note: e.target.value }))
            }
          />
          <Input
            type="date"
            value={newRecv.dueDate}
            onChange={(e) =>
              setNewRecv((a) => ({ ...a, dueDate: e.target.value }))
            }
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                if (newRecv.name && newRecv.amount) {
                  setReceivables((rs) => [
                    ...rs,
                    {
                      ...newRecv,
                      id: Date.now().toString(),
                      amount: Number(newRecv.amount),
                      linkedTxIds: [],
                    },
                  ]);
                  setNewRecv({
                    name: "",
                    emoji: "👤",
                    amount: "",
                    note: "",
                    dueDate: "",
                  });
                  setShowRecvForm(false);
                }
              }}
            >
              Додати
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={() => setShowRecvForm(false)}
            >
              Скасувати
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowRecvForm(true)}
          className="w-full py-2.5 text-sm text-muted border border-dashed border-line rounded-xl hover:border-primary hover:text-primary transition-colors"
        >
          + Додати актив «мені винні»
        </button>
      )}

      <SectionHeading as="div" size="sm" className="pt-2">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="piggy-bank" size={14} className="text-muted" />
          Інші активи
        </span>
      </SectionHeading>
      {showAssetForm ? (
        <Card
          ref={assetFormRef}
          variant="finyk-soft"
          radius="md"
          className="space-y-3"
        >
          <div>
            <div className="text-sm font-bold text-text">Новий актив</div>
            <div className="text-xs text-muted mt-0.5">
              Готівка, брокерський рахунок, крипта тощо.
            </div>
          </div>
          <Input
            ref={assetNameInputRef}
            placeholder="Назва"
            value={newAsset.name}
            onChange={(e) =>
              setNewAsset((a) => ({ ...a, name: e.target.value }))
            }
          />
          <Input
            placeholder="Сума"
            type="number"
            value={newAsset.amount}
            onChange={(e) =>
              setNewAsset((a) => ({ ...a, amount: e.target.value }))
            }
          />
          <select
            className="input-focus-finyk w-full h-11 rounded-2xl border border-line bg-panelHi px-4 text-text"
            value={newAsset.currency}
            onChange={(e) =>
              setNewAsset((a) => ({ ...a, currency: e.target.value }))
            }
          >
            <option>UAH</option>
            <option>USD</option>
            <option>EUR</option>
            <option>BTC</option>
          </select>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => {
                if (newAsset.name && newAsset.amount) {
                  setManualAssets((a) => [...a, newAsset]);
                  setNewAsset({
                    name: "",
                    amount: "",
                    currency: "UAH",
                    emoji: "💰",
                  });
                  setShowAssetForm(false);
                }
              }}
            >
              Додати
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={() => setShowAssetForm(false)}
            >
              Скасувати
            </Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowAssetForm(true)}
          className="w-full py-2.5 text-sm text-muted border border-dashed border-line rounded-xl hover:border-primary hover:text-primary transition-colors"
        >
          + Додати актив
        </button>
      )}
      {manualAssets.map((a, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-2.5 border-b border-text"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{a.emoji}</span>
            <div>
              <div className="text-sm font-medium">{a.name}</div>
              <div className="text-xs text-subtle">{a.currency}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-success">
              {Number(a.amount).toLocaleString("uk-UA")}{" "}
              {a.currency === "UAH"
                ? "₴"
                : a.currency === "USD"
                  ? "$"
                  : a.currency}
            </span>
            <button
              onClick={() =>
                setManualAssets((as) => as.filter((_, j) => j !== i))
              }
              className="text-subtle hover:text-danger text-sm transition-colors"
            >
              🗑
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
