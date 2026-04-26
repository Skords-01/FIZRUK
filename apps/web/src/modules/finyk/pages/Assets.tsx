import { useMemo, useState } from "react";
import { RecurringSuggestions } from "../components/RecurringSuggestions";
import {
  getMonoTotals,
  isMonoDebt,
  calcDebtRemaining,
  calcReceivableRemaining,
} from "../utils";
import { filterVisibleAccounts } from "@sergeant/finyk-domain/domain/assets/aggregates";
import { computeFinykSchedule, startOfToday } from "../lib/upcomingSchedule";
import { FinykStatsStrip } from "../components/FinykStatsStrip";
import { QuickActionButton, SectionBar } from "./AssetsBars";
import { AssetsTxPickerView } from "./AssetsTxPickerView";
import { AssetsNetworthHero } from "./AssetsNetworthHero";
import { AssetsSubscriptionsSection } from "./AssetsSubscriptionsSection";
import { AssetsOwnedSection } from "./AssetsOwnedSection";
import { AssetsLiabilitiesSection } from "./AssetsLiabilitiesSection";

export function Assets({
  mono,
  storage,
  showBalance = true,
  initialOpenDebt = false,
}) {
  const { accounts, transactions } = mono;
  const {
    hiddenAccounts,
    manualAssets,
    setManualAssets,
    manualDebts,
    setManualDebts,
    receivables,
    setReceivables,
    toggleLinkedTx,
    subscriptions,
    setSubscriptions,
    updateSubscription,
    addSubscriptionFromRecurring,
    dismissedRecurring,
    dismissRecurring,
    excludedTxIds,
    monoDebtLinkedTxIds,
    toggleMonoDebtTx,
    customCategories,
  } = storage;

  const [txPicker, setTxPicker] = useState(null);
  const [open, setOpen] = useState({
    subscriptions: false,
    assets: false,
    liabilities: initialOpenDebt,
  });

  const { balance: monoTotal, debt: monoTotalDebt } = getMonoTotals(
    accounts,
    hiddenAccounts,
  );
  const monoDebtAccounts = filterVisibleAccounts(
    accounts,
    hiddenAccounts,
  ).filter((a) => isMonoDebt(a));
  const manualDebtTotal = manualDebts.reduce(
    (s, d) => s + calcDebtRemaining(d, transactions),
    0,
  );
  const totalDebt = monoTotalDebt + manualDebtTotal;
  const totalReceivable = receivables.reduce(
    (s, r) => s + calcReceivableRemaining(r, transactions),
    0,
  );
  const manualAssetTotal = manualAssets
    .filter((a) => a.currency === "UAH")
    .reduce((s, a) => s + Number(a.amount), 0);
  const networth = monoTotal + manualAssetTotal + totalReceivable - totalDebt;
  const totalAssets = monoTotal + manualAssetTotal + totalReceivable;

  const [todayStart] = useState<Date>(startOfToday);

  const { urgentLiability } = useMemo(
    () =>
      computeFinykSchedule({
        subscriptions,
        manualDebts,
        receivables,
        transactions,
        todayStart,
      }),
    [subscriptions, manualDebts, receivables, transactions, todayStart],
  );

  const openSubscriptionForm = () => {
    setOpen((v) => ({ ...v, subscriptions: true }));
  };
  const openAssetForm = () => {
    setOpen((v) => ({ ...v, assets: true }));
  };
  const openDebtForm = () => {
    setOpen((v) => ({ ...v, liabilities: true }));
  };

  if (txPicker) {
    return (
      <AssetsTxPickerView
        txPicker={txPicker}
        setTxPicker={setTxPicker}
        accounts={accounts}
        transactions={transactions}
        monoDebtLinkedTxIds={monoDebtLinkedTxIds}
        toggleMonoDebtTx={toggleMonoDebtTx}
        subscriptions={subscriptions}
        updateSubscription={updateSubscription}
        manualDebts={manualDebts}
        receivables={receivables}
        toggleLinkedTx={toggleLinkedTx}
        showBalance={showBalance}
        customCategories={customCategories}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 pt-4 page-tabbar-pad space-y-1">
        <AssetsNetworthHero
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
          onOpenLiabilities={() =>
            setOpen((v) => ({ ...v, liabilities: true }))
          }
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
        {open.subscriptions && (
          <AssetsSubscriptionsSection
            subscriptions={subscriptions}
            setSubscriptions={setSubscriptions}
            transactions={transactions}
            setTxPicker={setTxPicker}
          />
        )}

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
        {open.assets && (
          <AssetsOwnedSection
            accounts={accounts}
            hiddenAccounts={hiddenAccounts}
            manualAssets={manualAssets}
            setManualAssets={setManualAssets}
            receivables={receivables}
            setReceivables={setReceivables}
            transactions={transactions}
            setTxPicker={setTxPicker}
          />
        )}

        {/* Liabilities section */}
        <SectionBar
          title="Пасиви"
          iconName="trending-down"
          iconTone="danger"
          summary={`−${totalDebt.toLocaleString("uk-UA", {
            maximumFractionDigits: 0,
          })} ₴`}
          open={open.liabilities}
          onToggle={() =>
            setOpen((v) => ({ ...v, liabilities: !v.liabilities }))
          }
        />
        {open.liabilities && (
          <AssetsLiabilitiesSection
            monoDebtAccounts={monoDebtAccounts}
            monoDebtLinkedTxIds={monoDebtLinkedTxIds}
            manualDebts={manualDebts}
            setManualDebts={setManualDebts}
            transactions={transactions}
            setTxPicker={setTxPicker}
            initialShowDebtForm={initialOpenDebt}
          />
        )}
      </div>
    </div>
  );
}
