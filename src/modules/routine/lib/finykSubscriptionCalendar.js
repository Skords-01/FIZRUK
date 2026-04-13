import { DEFAULT_SUBSCRIPTIONS } from "../../finyk/constants.js";
import { getSubscriptionAmountMeta } from "../../finyk/domain/subscriptionUtils.js";
import { enumerateDateKeys, parseDateKey } from "./hubCalendarAggregate.js";

export const FINYK_SUB_GROUP_LABEL = "Фінік · підписки";

const SUBS_KEY = "finyk_subs";
const TX_CACHE_KEY = "finyk_tx_cache";
const TX_LAST_GOOD_KEY = "finyk_tx_cache_last_good";

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadFinykSubscriptionsFromStorage() {
  try {
    const raw = localStorage.getItem(SUBS_KEY);
    if (!raw) return [...DEFAULT_SUBSCRIPTIONS];
    const arr = safeParse(raw, []);
    return Array.isArray(arr) && arr.length ? arr : [...DEFAULT_SUBSCRIPTIONS];
  } catch {
    return [...DEFAULT_SUBSCRIPTIONS];
  }
}

/** Транзакції з кешу Monobank (для сум і прив’язок). */
export function loadFinykTransactionsFromStorage() {
  try {
    const raw = localStorage.getItem(TX_CACHE_KEY);
    if (raw) {
      const c = safeParse(raw, null);
      if (c?.txs?.length) return c.txs;
    }
    const raw2 = localStorage.getItem(TX_LAST_GOOD_KEY);
    if (raw2) {
      const c = safeParse(raw2, null);
      if (c?.txs?.length) return c.txs;
    }
  } catch {
    /* noop */
  }
  return [];
}

function scheduledBillingDom(year, monthIndex, billingDay) {
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Number(billingDay) || 1, dim);
}

function isBillingDateKey(dateKey, billingDay) {
  const d = parseDateKey(dateKey);
  const dom = scheduledBillingDom(d.getFullYear(), d.getMonth(), billingDay);
  return d.getDate() === dom;
}

/**
 * Події календаря для підписок Фініка (планове списання раз на місяць).
 */
export function buildFinykSubscriptionEvents(range) {
  const { startKey, endKey } = range;
  const subs = loadFinykSubscriptionsFromStorage();
  const txs = loadFinykTransactionsFromStorage();
  const days = enumerateDateKeys(startKey, endKey);
  const out = [];

  for (const sub of subs) {
    const bd = Number(sub.billingDay);
    if (!Number.isFinite(bd) || bd < 1 || bd > 31) continue;
    const { amount, currency } = getSubscriptionAmountMeta(sub, txs);
    const subTitle = `${sub.emoji || "📱"} ${sub.name || "Підписка"}`;
    for (const date of days) {
      if (!isBillingDateKey(date, bd)) continue;
      const amtStr =
        amount != null
          ? `~${amount.toLocaleString("uk-UA", { maximumFractionDigits: 2 })} ${currency}`
          : "сума з транзакції або вручну у Фініку";
      out.push({
        id: `finyk_sub_${sub.id}_${date}`,
        source: "finyk_subscription",
        date,
        title: subTitle,
        subtitle: `Планове списання · ${amtStr}`,
        tagLabels: [FINYK_SUB_GROUP_LABEL],
        sortKey: `${date} 0b finyk_${sub.id}`,
        fizruk: false,
        finykSub: true,
        sourceKind: "finyk_sub",
      });
    }
  }

  return out;
}
