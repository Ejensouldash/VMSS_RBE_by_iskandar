/**
 * =====================================================================
 *  VMMS PROFIT ENGINE
 * ---------------------------------------------------------------------
 *  Single source of truth for all revenue / cost / profit computation.
 *
 *  Design goals:
 *   - Deterministic, testable, side-effect free (pure functions).
 *   - Accurate cost lookup using the COMMODITIES master table
 *     (vm-config.ts) with a graceful fallback margin.
 *   - Period summaries for: THIS HOUR, TODAY, THIS WEEK, THIS MONTH,
 *     plus ALL-TIME.
 *   - Ready-to-render chart series (hourly, daily, monthly, per-product,
 *     per-payment-method).
 *
 *  Formulas
 *  --------
 *   unitCost      = cost of goods for a single transaction
 *   revenue       = Σ amount            (countable transactions only)
 *   cost (COGS)   = Σ unitCost
 *   grossProfit   = revenue - cost
 *   margin (%)    = revenue > 0 ? (grossProfit / revenue) * 100 : 0
 *
 *  A transaction is "countable" when it is not explicitly FAILED or
 *  PENDING (imported / legacy rows without a status are treated as sales
 *  so historical data is never silently dropped).
 * =====================================================================
 */

import { Transaction } from '../types';
import { VM_CONFIG } from '../lib/vm-config';

/** If a product has no known cost, assume COGS is this fraction of price. */
export const DEFAULT_COST_RATIO = 0.6; // => 40% gross margin fallback

export interface EnrichedTransaction extends Transaction {
  cost: number;
  profit: number;
}

export interface PeriodStats {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // percentage 0-100
  count: number;
}

export interface SeriesPoint {
  label: string;
  revenue: number;
  profit: number;
  count: number;
}

export interface DashboardMetrics {
  thisHour: PeriodStats;
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  all: PeriodStats;
  /** growth of today's revenue vs yesterday's (same-time), percentage */
  todayVsYesterdayPct: number;
  hourlyToday: SeriesPoint[];   // 24 buckets, 00:00 .. 23:00
  last7Days: SeriesPoint[];     // rolling 7 days ending today
  last12Months: SeriesPoint[];  // rolling 12 months ending this month
  topProducts: { name: string; units: number; profit: number; revenue: number }[];
  paymentMix: { name: string; value: number; revenue: number }[];
}

// ---------------------------------------------------------------------
//  COST LOOKUP
// ---------------------------------------------------------------------

const normalize = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Pre-build fast lookups from the COMMODITIES master table.
const COST_BY_SKU: Record<string, number> = {};
const COST_TABLE: { key: string; cost: number }[] = [];

(VM_CONFIG.COMMODITIES || []).forEach((c: any) => {
  if (c.sku) COST_BY_SKU[c.sku] = c.costPrice;
  COST_TABLE.push({ key: normalize(c.name), cost: c.costPrice });
});

/**
 * Resolve the cost of goods for a single transaction.
 * Priority:
 *   1. Explicit tx.cost (already enriched upstream).
 *   2. Match by slotId against COMMODITIES sku.
 *   3. Fuzzy-ish match by normalized product name (substring both ways).
 *   4. Fallback: DEFAULT_COST_RATIO * amount.
 */
export const getUnitCost = (tx: Transaction): number => {
  if (typeof tx.cost === 'number' && tx.cost > 0) return tx.cost;

  if (tx.slotId && COST_BY_SKU[tx.slotId] !== undefined) {
    return COST_BY_SKU[tx.slotId];
  }

  const name = normalize(tx.productName);
  if (name) {
    // exact normalized name
    const exact = COST_TABLE.find(c => c.key === name);
    if (exact) return exact.cost;
    // substring either direction (handles "Coca Cola" vs "Coca Cola 320ml")
    const partial = COST_TABLE.find(
      c => c.key && (c.key.includes(name) || name.includes(c.key))
    );
    if (partial) return partial.cost;
  }

  const amount = toNumber(tx.amount);
  return +(amount * DEFAULT_COST_RATIO).toFixed(4);
};

// ---------------------------------------------------------------------
//  HELPERS
// ---------------------------------------------------------------------

const toNumber = (v: any): number => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
};

const isCountable = (tx: Transaction): boolean =>
  tx.status !== 'FAILED' && tx.status !== 'PENDING';

const time = (tx: Transaction): number => new Date(tx.timestamp).getTime();

export const enrichTransaction = (tx: Transaction): EnrichedTransaction => {
  const amount = toNumber(tx.amount);
  const cost = getUnitCost(tx);
  return { ...tx, amount, cost, profit: +(amount - cost).toFixed(4) };
};

export const enrichTransactions = (txs: Transaction[]): EnrichedTransaction[] =>
  (Array.isArray(txs) ? txs : []).filter(isCountable).map(enrichTransaction);

// ---------------------------------------------------------------------
//  PERIOD BOUNDARIES
// ---------------------------------------------------------------------

export const periodBounds = (now = new Date()) => {
  const startOfHour = new Date(
    now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()
  ).getTime();

  const startOfToday = new Date(
    now.getFullYear(), now.getMonth(), now.getDate()
  ).getTime();

  const startOfYesterday = startOfToday - 86400000;

  // Week starts Monday 00:00
  const day = now.getDay(); // 0 = Sun .. 6 = Sat
  const daysSinceMonday = (day + 6) % 7;
  const startOfWeek = startOfToday - daysSinceMonday * 86400000;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return { now: now.getTime(), startOfHour, startOfToday, startOfYesterday, startOfWeek, startOfMonth };
};

// ---------------------------------------------------------------------
//  SUMMARIES
// ---------------------------------------------------------------------

const summarize = (
  txs: EnrichedTransaction[],
  key: string,
  label: string,
  from: number,
  to: number = Infinity
): PeriodStats => {
  let revenue = 0, cost = 0, count = 0;
  for (const t of txs) {
    const ts = time(t);
    if (ts >= from && ts < to) {
      revenue += t.amount;
      cost += t.cost;
      count++;
    }
  }
  const profit = revenue - cost;
  return {
    key,
    label,
    revenue: round(revenue),
    cost: round(cost),
    profit: round(profit),
    margin: revenue > 0 ? round((profit / revenue) * 100) : 0,
    count,
  };
};

const round = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------
//  CHART SERIES
// ---------------------------------------------------------------------

const buildHourlyToday = (txs: EnrichedTransaction[], startOfToday: number): SeriesPoint[] => {
  const buckets: SeriesPoint[] = Array.from({ length: 24 }, (_, h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    revenue: 0, profit: 0, count: 0,
  }));
  const endOfToday = startOfToday + 86400000;
  for (const t of txs) {
    const ts = time(t);
    if (ts >= startOfToday && ts < endOfToday) {
      const h = new Date(ts).getHours();
      buckets[h].revenue = round(buckets[h].revenue + t.amount);
      buckets[h].profit = round(buckets[h].profit + t.profit);
      buckets[h].count++;
    }
  }
  return buckets;
};

const buildLastNDays = (txs: EnrichedTransaction[], days: number, now: Date): SeriesPoint[] => {
  const map: Record<string, SeriesPoint> = {};
  const order: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().split('T')[0];
    order.push(key);
    map[key] = {
      label: d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }),
      revenue: 0, profit: 0, count: 0,
    };
  }
  for (const t of txs) {
    const key = new Date(time(t)).toISOString().split('T')[0];
    if (map[key]) {
      map[key].revenue = round(map[key].revenue + t.amount);
      map[key].profit = round(map[key].profit + t.profit);
      map[key].count++;
    }
  }
  return order.map(k => map[k]);
};

const buildLastNMonths = (txs: EnrichedTransaction[], months: number, now: Date): SeriesPoint[] => {
  const map: Record<string, SeriesPoint> = {};
  const order: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    order.push(key);
    map[key] = {
      label: `${d.toLocaleString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`,
      revenue: 0, profit: 0, count: 0,
    };
  }
  for (const t of txs) {
    const d = new Date(time(t));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (map[key]) {
      map[key].revenue = round(map[key].revenue + t.amount);
      map[key].profit = round(map[key].profit + t.profit);
      map[key].count++;
    }
  }
  return order.map(k => map[k]);
};

const buildTopProducts = (txs: EnrichedTransaction[], limit = 6) => {
  const agg: Record<string, { name: string; units: number; profit: number; revenue: number }> = {};
  for (const t of txs) {
    const name = t.productName || 'Unknown';
    if (!agg[name]) agg[name] = { name, units: 0, profit: 0, revenue: 0 };
    agg[name].units++;
    agg[name].profit = round(agg[name].profit + t.profit);
    agg[name].revenue = round(agg[name].revenue + t.amount);
  }
  return Object.values(agg).sort((a, b) => b.profit - a.profit).slice(0, limit);
};

const buildPaymentMix = (txs: EnrichedTransaction[]) => {
  const agg: Record<string, { name: string; value: number; revenue: number }> = {};
  for (const t of txs) {
    const name = t.paymentMethod || 'Other';
    if (!agg[name]) agg[name] = { name, value: 0, revenue: 0 };
    agg[name].value++;
    agg[name].revenue = round(agg[name].revenue + t.amount);
  }
  return Object.values(agg).sort((a, b) => b.value - a.value);
};

// ---------------------------------------------------------------------
//  MAIN ENTRY
// ---------------------------------------------------------------------

/**
 * Compute the full metric bundle used by the dashboard in one pass.
 * Pass raw transactions; enrichment + filtering happens internally.
 */
export const computeDashboardMetrics = (
  raw: Transaction[],
  reference = new Date()
): DashboardMetrics => {
  const txs = enrichTransactions(raw);
  const b = periodBounds(reference);

  const thisHour = summarize(txs, 'hour', 'This Hour', b.startOfHour);
  const today = summarize(txs, 'today', 'Today', b.startOfToday);
  const week = summarize(txs, 'week', 'This Week', b.startOfWeek);
  const month = summarize(txs, 'month', 'This Month', b.startOfMonth);
  const all = summarize(txs, 'all', 'All Time', 0);

  // Yesterday up to the same clock time (fair day-over-day comparison).
  const elapsedToday = b.now - b.startOfToday;
  const yesterday = summarize(
    txs, 'yesterday', 'Yesterday',
    b.startOfYesterday, b.startOfYesterday + elapsedToday
  );
  const todayVsYesterdayPct = yesterday.revenue > 0
    ? round(((today.revenue - yesterday.revenue) / yesterday.revenue) * 100)
    : (today.revenue > 0 ? 100 : 0);

  return {
    thisHour, today, week, month, all,
    todayVsYesterdayPct,
    hourlyToday: buildHourlyToday(txs, b.startOfToday),
    last7Days: buildLastNDays(txs, 7, reference),
    last12Months: buildLastNMonths(txs, 12, reference),
    topProducts: buildTopProducts(txs),
    paymentMix: buildPaymentMix(txs),
  };
};

/** Currency formatter shared across the app. */
export const formatRM = (val: number) =>
  new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val || 0);

export const formatCompactRM = (val: number) => {
  const v = val || 0;
  if (Math.abs(v) >= 1000) return `RM ${(v / 1000).toFixed(1)}k`;
  return `RM ${v.toFixed(2)}`;
};
