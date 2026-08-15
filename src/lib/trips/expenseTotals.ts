import { expandShares } from './balances';
import { EXPENSE_CATEGORIES } from './expenseCategory';
import { convertCurrency, convertToEur, type EurRates } from './fx';
import type { Expense, ExpenseCategory } from './types';

export interface CurrencyTotal {
  currency: string;
  total: number;
  mine: number;
}

export interface ExpenseCurrencyTotals {
  byCurrency: CurrencyTotal[];
}

export interface CombinedTotal {
  /** Target currency the figures below are expressed in. */
  currency: string;
  total: number;
  mine: number;
  /** Currencies that couldn't be converted and were left out of the sum. */
  unconvertible: string[];
}

/**
 * Fold a per-currency breakdown into a single target currency. Currencies that
 * can't be converted (missing/invalid rate) are excluded from the sum and
 * reported in `unconvertible` so the UI can flag them rather than under-report
 * silently. The target currency itself always passes through untouched.
 */
export function combineInCurrency(
  byCurrency: CurrencyTotal[],
  target: string,
  rates: EurRates,
): CombinedTotal {
  const targetCode = target.toUpperCase();
  const combined: CombinedTotal = {
    currency: targetCode,
    total: 0,
    mine: 0,
    unconvertible: [],
  };

  for (const c of byCurrency) {
    const total = convertCurrency(c.total, c.currency, targetCode, rates);
    if (total === null) {
      combined.unconvertible.push(c.currency);
      continue;
    }
    combined.total += total;
    const mine = convertCurrency(c.mine, c.currency, targetCode, rates);
    if (mine !== null) combined.mine += mine;
  }

  return combined;
}

interface Bucket {
  total: number;
  mine: number;
}

function emptyBucket(): Bucket {
  return { total: 0, mine: 0 };
}

function addToBucket(
  buckets: Map<string, Bucket>,
  expense: Expense,
  currentMemberId: string | null,
): void {
  const code = expense.currency.toUpperCase();
  const bucket = buckets.get(code) ?? emptyBucket();
  bucket.total += expense.amount;
  if (currentMemberId && expense.amount > 0) {
    const shares = expandShares(expense);
    const mineShare = shares.find((s) => s.memberId === currentMemberId);
    if (mineShare) bucket.mine += mineShare.share;
  }
  buckets.set(code, bucket);
}

function toSortedList(buckets: Map<string, Bucket>): CurrencyTotal[] {
  return [...buckets.entries()]
    .map(([currency, b]) => ({ currency, total: b.total, mine: b.mine }))
    .sort((a, b) => b.total - a.total || a.currency.localeCompare(b.currency));
}

/**
 * Sum expenses per currency (no FX). `mine` is the current member's share in
 * that currency, computed from the same per-row split logic as balances.
 */
export function aggregateByCurrency(
  expenses: Expense[],
  currentMemberId: string | null,
): ExpenseCurrencyTotals {
  const buckets = new Map<string, Bucket>();
  for (const expense of expenses) {
    addToBucket(buckets, expense, currentMemberId);
  }
  return { byCurrency: toSortedList(buckets) };
}

export type CategoryTotals = Record<ExpenseCategory, Bucket>;

function emptyCategoryTotals(): CategoryTotals {
  const out = {} as CategoryTotals;
  for (const category of EXPENSE_CATEGORIES) {
    out[category] = emptyBucket();
  }
  return out;
}

/**
 * Sum expenses per category in EUR. Each bucket carries both the trip `total`
 * and the current member's `mine` share (via the same per-row split logic as
 * balances). Expenses in non-convertible currencies are skipped, mirroring the
 * category widget's prior behaviour. When `rates` is null every bucket is zero.
 */
export function aggregateByCategory(
  expenses: Expense[],
  rates: EurRates | null,
  currentMemberId: string | null,
): CategoryTotals {
  const totals = emptyCategoryTotals();
  if (!rates) return totals;

  for (const expense of expenses) {
    const eurTotal = convertToEur(expense.amount, expense.currency, rates);
    if (eurTotal === null) continue;

    const bucket = totals[expense.category];
    bucket.total += eurTotal;

    if (currentMemberId && expense.amount > 0) {
      const shares = expandShares(expense);
      const mineShare = shares.find((s) => s.memberId === currentMemberId);
      if (mineShare) {
        // Convert the native-currency share to EUR using the row's own rate.
        bucket.mine += eurTotal * (mineShare.share / expense.amount);
      }
    }
  }

  return totals;
}

/**
 * Build a map of itemId → per-currency totals. Expenses without `itemId` are
 * skipped.
 */
export function buildItemCurrencyTotals(
  expenses: Expense[],
  currentMemberId: string | null,
): Map<string, ExpenseCurrencyTotals> {
  const perItem = new Map<string, Map<string, Bucket>>();
  for (const expense of expenses) {
    if (!expense.itemId) continue;
    const buckets = perItem.get(expense.itemId) ?? new Map<string, Bucket>();
    addToBucket(buckets, expense, currentMemberId);
    perItem.set(expense.itemId, buckets);
  }
  const out = new Map<string, ExpenseCurrencyTotals>();
  for (const [itemId, buckets] of perItem) {
    out.set(itemId, { byCurrency: toSortedList(buckets) });
  }
  return out;
}
