import { DebtCard } from "../components/DebtCard";
import { SubCard } from "../components/SubCard";
import { RecurringSuggestions } from "../components/RecurringSuggestions";
import { SectionHeading } from "@shared/components/ui/SectionHeading";
import { Icon } from "@shared/components/ui/Icon";
import {
  getAccountLabel,
  getMonoDebt,
  getDebtPaid,
  getRecvPaid,
  calcDebtRemaining,
  calcReceivableRemaining,
  getDebtEffectiveTotal,
  getReceivableEffectiveTotal,
} from "../utils";
import { cn } from "@shared/lib/cn";
import { openHubModule } from "@shared/lib/hubNav";
import { useToast } from "@shared/hooks/useToast";
import { showUndoToast } from "@shared/lib/undoToast";
import { notifyFinykRoutineCalendarSync } from "../hubRoutineSync";
import { FinykStatsStrip } from "../components/FinykStatsStrip";
import {
  AssetsLiabilitiesBar,
  QuickActionButton,
  SectionBar,
} from "./AssetsBars";
import {
  SubscriptionForm,
  ReceivableForm,
  AssetForm,
  DebtForm,
} from "./AssetsForm";
import type { useAssetsState } from "./useAssetsState";

type State = ReturnType<typeof useAssetsState>;

// ---------------------------------------------------------------------------
// Networth hero card
// ---------------------------------------------------------------------------
export function AssetsNetworthCard({
  networth,
  totalAssets,
  totalDebt,
  showBalance,
}: Pick<State, "networth" | "totalAssets" | "totalDebt" | "showBalance">) {
  return (
    <div className="rounded-3xl bg-finyk/[.06] dark:bg-finyk-surface-dark/10 border border-finyk/[.14] dark:border-finyk-border-dark/20 p-5 mb-3 shadow-card">
      <p className="text-sm text-muted">Загальний нетворс</p>
      <div
        className={cn(
          "text-[40px] font-bold tracking-tight leading-tight mt-2 tabular-nums text-finyk-strong dark:text-finyk",
          !showBalance && "tracking-widest",
        )}
      >
        {showBalance ? (
          <>
            {networth.toLocaleString("uk-UA", { maximumFractionDigits: 0 })}
            <span className="text-2xl font-semibold text-finyk/60 ml-1">₴</span>
          </>
        ) : (
          "\u2022\u2022\u2022\u2022\u2022\u2022"
        )}
      </div>
      {showBalance ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-finyk/20 text-sm">
          <div>
            <div className="text-xs text-subtle mb-0.5">Активи</div>
            <div className="font-semibold tabular-nums text-text">
              {`+${totalAssets.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴`}
            </div>
          </div>
          <div className="w-px bg-finyk/20 hidden sm:block self-stretch min-h-[2.5rem]" />
          <div>
            <div className="text-xs text-subtle mb-0.5">Пасиви</div>
            <div className="font-semibold tabular-nums text-text">
              {`\u2212${totalDebt.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴`}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted mt-3">Суми приховано</p>
      )}
      {showBalance && totalAssets + totalDebt > 0 && (
        <AssetsLiabilitiesBar assets={totalAssets} liabilities={totalDebt} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscriptions section body
// ---------------------------------------------------------------------------
export function AssetsSubscriptionsSection({ state }: { state: State }) {
  const {
    subscriptions,
    setSubscriptions,
    transactions,
    showSubForm,
    setShowSubForm,
    newSub,
    setNewSub,
    setTxPicker,
  } = state;
  const toast = useToast();

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
            const removed = sub;
            const removedIdx = i;
            setSubscriptions((ss) => ss.filter((_, j) => j !== removedIdx));
            notifyFinykRoutineCalendarSync();
            showUndoToast(toast, {
              msg: `Видалено підписку «${removed.name}»`,
              onUndo: () => {
                setSubscriptions((ss) => {
                  const next = [...ss];
                  next.splice(removedIdx, 0, removed);
                  return next;
                });
                notifyFinykRoutineCalendarSync();
              },
            });
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
        <SubscriptionForm
          newSub={newSub}
          setNewSub={setNewSub}
          setSubscriptions={setSubscriptions}
          setShowSubForm={setShowSubForm}
        />
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

// ---------------------------------------------------------------------------
// Assets section body (Monobank accounts + receivables + manual assets)
// ---------------------------------------------------------------------------
export function AssetsAssetsSection({ state }: { state: State }) {
  const toast = useToast();
  const {
    accounts,
    transactions,
    hiddenAccounts,
    manualAssets,
    setManualAssets,
    receivables,
    setReceivables,
    showRecvForm,
    setShowRecvForm,
    showAssetForm,
    setShowAssetForm,
    newRecv,
    setNewRecv,
    newAsset,
    setNewAsset,
    assetFormRef,
    assetNameInputRef,
    setTxPicker,
  } = state;

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
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-surface-muted text-muted"
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
          onDelete={() => {
            const removed = r;
            setReceivables((rs) => rs.filter((x) => x.id !== removed.id));
            showUndoToast(toast, {
              msg: `Видалено борг «${removed.name}»`,
              onUndo: () => setReceivables((rs) => [...rs, removed]),
            });
          }}
          onLink={() => setTxPicker({ id: r.id, type: "recv" })}
          linkedCount={r.linkedTxIds?.length || 0}
        />
      ))}
      {showRecvForm ? (
        <ReceivableForm
          newRecv={newRecv}
          setNewRecv={setNewRecv}
          setReceivables={setReceivables}
          setShowRecvForm={setShowRecvForm}
        />
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
        <AssetForm
          newAsset={newAsset}
          setNewAsset={setNewAsset}
          setManualAssets={setManualAssets}
          setShowAssetForm={setShowAssetForm}
          assetFormRef={assetFormRef}
          assetNameInputRef={assetNameInputRef}
        />
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
              onClick={() => {
                const removed = a;
                const removedIdx = i;
                setManualAssets((as) =>
                  as.filter((_, j) => j !== removedIdx),
                );
                showUndoToast(toast, {
                  msg: `Видалено актив «${removed.name}»`,
                  onUndo: () =>
                    setManualAssets((as) => {
                      const next = [...as];
                      next.splice(removedIdx, 0, removed);
                      return next;
                    }),
                });
              }}
              className="text-subtle hover:text-danger text-sm transition-colors"
              aria-label={`Видалити актив ${a.name}`}
            >
              {"\u{1F5D1}"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Liabilities section body
// ---------------------------------------------------------------------------
export function AssetsLiabilitiesSection({ state }: { state: State }) {
  const toast = useToast();
  const {
    transactions,
    manualDebts,
    setManualDebts,
    monoDebtAccounts,
    monoDebtLinkedTxIds,
    showDebtForm,
    setShowDebtForm,
    newDebt,
    setNewDebt,
    debtFormRef,
    debtNameInputRef,
    setTxPicker,
  } = state;

  return (
    <div className="mb-3 space-y-0">
      {showDebtForm ? (
        <DebtForm
          newDebt={newDebt}
          setNewDebt={setNewDebt}
          setManualDebts={setManualDebts}
          setShowDebtForm={setShowDebtForm}
          debtFormRef={debtFormRef}
          debtNameInputRef={debtNameInputRef}
        />
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
            emoji={"\u{1F5A4}"}
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
          onDelete={() => {
            const removed = d;
            setManualDebts((ds) => ds.filter((x) => x.id !== removed.id));
            showUndoToast(toast, {
              msg: `Видалено борг «${removed.name}»`,
              onUndo: () => setManualDebts((ds) => [...ds, removed]),
            });
          }}
          onLink={() => setTxPicker({ id: d.id, type: "debt" })}
          linkedCount={d.linkedTxIds?.length || 0}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main table: networth + stats + quick actions + all three sections
// ---------------------------------------------------------------------------
export function AssetsTable({ state }: { state: State }) {
  const {
    networth,
    totalAssets,
    totalDebt,
    showBalance,
    urgentLiability,
    todayStart,
    open,
    setOpen,
    subscriptions,
    transactions,
    dismissedRecurring,
    excludedTxIds,
    addSubscriptionFromRecurring,
    dismissRecurring,
    openSubscriptionForm,
    openAssetForm,
    openDebtForm,
  } = state;

  return (
    <>
      <AssetsNetworthCard
        networth={networth}
        totalAssets={totalAssets}
        totalDebt={totalDebt}
        showBalance={showBalance}
      />

      <FinykStatsStrip
        subsMonthly={0}
        subsCount={0}
        nextCharge={null}
        urgentLiability={urgentLiability}
        todayStart={todayStart}
        showBalance={showBalance}
        onOpenLiabilities={() => setOpen((v) => ({ ...v, liabilities: true }))}
        className="mb-3"
      />

      <div className="grid grid-cols-3 gap-2 mb-3">
        <QuickActionButton
          iconName="refresh-cw"
          label="Підписка"
          onClick={openSubscriptionForm}
        />
        <QuickActionButton
          iconName="trending-up"
          label="Актив"
          onClick={openAssetForm}
        />
        <QuickActionButton
          iconName="trending-down"
          label="Пасив"
          onClick={openDebtForm}
        />
      </div>

      <RecurringSuggestions
        transactions={transactions}
        subscriptions={subscriptions}
        dismissedRecurring={dismissedRecurring}
        excludedTxIds={excludedTxIds}
        onAdd={(candidate) => addSubscriptionFromRecurring?.(candidate)}
        onDismiss={(key) => dismissRecurring?.(key)}
      />

      {/* Subscriptions section */}
      <SectionBar
        title="Підписки"
        iconName="refresh-cw"
        summary={`${subscriptions.length} активн${
          subscriptions.length === 1 ? "а" : "их"
        }`}
        open={open.subscriptions}
        onToggle={() =>
          setOpen((v) => ({ ...v, subscriptions: !v.subscriptions }))
        }
      />
      {open.subscriptions && <AssetsSubscriptionsSection state={state} />}

      {/* Assets section */}
      <SectionBar
        title="Активи"
        iconName="trending-up"
        iconTone="success"
        summary={`+${totalAssets.toLocaleString("uk-UA", {
          maximumFractionDigits: 0,
        })} ₴`}
        open={open.assets}
        onToggle={() => setOpen((v) => ({ ...v, assets: !v.assets }))}
      />
      {open.assets && <AssetsAssetsSection state={state} />}

      {/* Liabilities section */}
      <SectionBar
        title="Пасиви"
        iconName="trending-down"
        iconTone="danger"
        summary={`\u2212${totalDebt.toLocaleString("uk-UA", {
          maximumFractionDigits: 0,
        })} ₴`}
        open={open.liabilities}
        onToggle={() => setOpen((v) => ({ ...v, liabilities: !v.liabilities }))}
      />
      {open.liabilities && <AssetsLiabilitiesSection state={state} />}
    </>
  );
}
