function toAmountUAH(tx) {
  return Math.abs((tx?.amount || 0) / 100);
}

function findLinkedTx(linkedTxIds = [], transactions = []) {
  const index = new Map(transactions.map(tx => [tx.id, tx]));
  return linkedTxIds.map(id => index.get(id)).filter(Boolean);
}

export function getDebtTxRole(tx) {
  return tx.amount > 0
    ? { kind: "origin", label: "📥 Виникнення боргу", color: "#f87171" }
    : { kind: "payment", label: "✅ Сплата боргу", color: "#22c55e" };
}

export function getReceivableTxRole(tx) {
  return tx.amount < 0
    ? { kind: "origin", label: "📤 Виникнення боргу", color: "#f87171" }
    : { kind: "payment", label: "✅ Погашення боргу", color: "#22c55e" };
}

// Я винен: погашення рахуємо тільки по витратах (amount < 0)
export function getDebtPaid(debt, transactions = []) {
  const linked = findLinkedTx(debt?.linkedTxIds || [], transactions);
  return linked
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + toAmountUAH(tx), 0);
}

// Мені винні: погашення рахуємо тільки по надходженнях (amount > 0)
export function getReceivablePaid(receivable, transactions = []) {
  const linked = findLinkedTx(receivable?.linkedTxIds || [], transactions);
  return linked
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + toAmountUAH(tx), 0);
}

export function calcDebtRemaining(debt, transactions = []) {
  return Math.max(0, Number(debt?.totalAmount || 0) - getDebtPaid(debt, transactions));
}

export function calcReceivableRemaining(receivable, transactions = []) {
  return Math.max(0, Number(receivable?.amount || 0) - getReceivablePaid(receivable, transactions));
}
