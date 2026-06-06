import { describe, expect, it } from 'vitest';
import {
  aggregateByCategory,
  aggregateByCurrency,
  buildItemCurrencyTotals,
} from './expenseTotals';
import type { EurRates } from './fx';
import type { Expense } from './types';

const tripId = 'trip-1';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e-1',
    tripId,
    title: 'X',
    amount: 100,
    currency: 'EUR',
    payerMemberId: 'm-a',
    spentOn: '2026-05-28',
    category: 'other',
    mode: 'equally',
    shares: [
      { memberId: 'm-a', value: null, locked: false },
      { memberId: 'm-b', value: null, locked: false },
    ],
    ...overrides,
  };
}

describe('aggregateByCurrency', () => {
  it('returns empty list for no expenses', () => {
    expect(aggregateByCurrency([], 'm-a')).toEqual({ byCurrency: [] });
  });

  it('sums a single currency without FX', () => {
    const expenses = [
      makeExpense({ id: 'e-1', amount: 100, currency: 'EUR' }),
      makeExpense({ id: 'e-2', amount: 50, currency: 'EUR' }),
    ];
    const result = aggregateByCurrency(expenses, 'm-a');
    expect(result.byCurrency).toEqual([
      { currency: 'EUR', total: 150, mine: 75 },
    ]);
  });

  it('splits into per-currency buckets sorted by total desc', () => {
    const expenses = [
      makeExpense({ id: 'e-1', amount: 30, currency: 'USD' }),
      makeExpense({ id: 'e-2', amount: 100, currency: 'EUR' }),
      makeExpense({ id: 'e-3', amount: 60, currency: 'EUR' }),
    ];
    const result = aggregateByCurrency(expenses, 'm-a');
    expect(result.byCurrency).toEqual([
      { currency: 'EUR', total: 160, mine: 80 },
      { currency: 'USD', total: 30, mine: 15 },
    ]);
  });

  it('normalises currency codes to uppercase', () => {
    const expenses = [
      makeExpense({ id: 'e-1', amount: 10, currency: 'eur' }),
      makeExpense({ id: 'e-2', amount: 5, currency: 'EUR' }),
    ];
    const result = aggregateByCurrency(expenses, null);
    expect(result.byCurrency).toEqual([
      { currency: 'EUR', total: 15, mine: 0 },
    ]);
  });

  it('omits mine when currentMemberId is null', () => {
    const expenses = [makeExpense({ amount: 80 })];
    const result = aggregateByCurrency(expenses, null);
    expect(result.byCurrency).toEqual([
      { currency: 'EUR', total: 80, mine: 0 },
    ]);
  });

  it('omits mine when current member is not in shares', () => {
    const expenses = [
      makeExpense({
        amount: 80,
        shares: [
          { memberId: 'm-a', value: null, locked: false },
          { memberId: 'm-b', value: null, locked: false },
        ],
      }),
    ];
    const result = aggregateByCurrency(expenses, 'm-z');
    expect(result.byCurrency).toEqual([
      { currency: 'EUR', total: 80, mine: 0 },
    ]);
  });
});

describe('aggregateByCategory', () => {
  // 1 USD = 1.25 EUR-rate => 100 USD converts to 80 EUR.
  const rates: EurRates = { USD: 1.25 };

  it('returns zeroed buckets when rates are missing', () => {
    const expenses = [makeExpense({ amount: 100, category: 'restaurants' })];
    const result = aggregateByCategory(expenses, null, 'm-a');
    expect(result.restaurants).toEqual({ total: 0, mine: 0 });
    expect(result.transport).toEqual({ total: 0, mine: 0 });
  });

  it('buckets total and mine per category in EUR', () => {
    const expenses = [
      makeExpense({ id: 'e-1', amount: 100, category: 'restaurants' }),
      makeExpense({ id: 'e-2', amount: 40, category: 'transport' }),
    ];
    const result = aggregateByCategory(expenses, rates, 'm-a');
    expect(result.restaurants).toEqual({ total: 100, mine: 50 });
    expect(result.transport).toEqual({ total: 40, mine: 20 });
    expect(result.shopping).toEqual({ total: 0, mine: 0 });
  });

  it('converts foreign currencies to EUR before bucketing', () => {
    const expenses = [
      makeExpense({ amount: 100, currency: 'USD', category: 'shopping' }),
    ];
    const result = aggregateByCategory(expenses, rates, 'm-a');
    expect(result.shopping).toEqual({ total: 80, mine: 40 });
  });

  it('skips expenses in non-convertible currencies', () => {
    const expenses = [
      makeExpense({ amount: 100, currency: 'JPY', category: 'groceries' }),
      makeExpense({ amount: 50, currency: 'EUR', category: 'groceries' }),
    ];
    const result = aggregateByCategory(expenses, rates, 'm-a');
    expect(result.groceries).toEqual({ total: 50, mine: 25 });
  });

  it('leaves mine at zero when current member is not in shares', () => {
    const expenses = [makeExpense({ amount: 80, category: 'accommodation' })];
    const result = aggregateByCategory(expenses, rates, 'm-z');
    expect(result.accommodation).toEqual({ total: 80, mine: 0 });
  });

  it('leaves mine at zero when currentMemberId is null', () => {
    const expenses = [makeExpense({ amount: 60, category: 'entertainment' })];
    const result = aggregateByCategory(expenses, rates, null);
    expect(result.entertainment).toEqual({ total: 60, mine: 0 });
  });
});

describe('buildItemCurrencyTotals', () => {
  it('skips expenses without itemId', () => {
    const expenses = [makeExpense({ amount: 100 })];
    expect(buildItemCurrencyTotals(expenses, 'm-a').size).toBe(0);
  });

  it('groups per item and per currency', () => {
    const expenses = [
      makeExpense({ id: 'e-1', itemId: 'i-1', amount: 60, currency: 'EUR' }),
      makeExpense({ id: 'e-2', itemId: 'i-1', amount: 20, currency: 'USD' }),
      makeExpense({ id: 'e-3', itemId: 'i-2', amount: 30, currency: 'EUR' }),
    ];
    const result = buildItemCurrencyTotals(expenses, 'm-a');
    expect(result.get('i-1')?.byCurrency).toEqual([
      { currency: 'EUR', total: 60, mine: 30 },
      { currency: 'USD', total: 20, mine: 10 },
    ]);
    expect(result.get('i-2')?.byCurrency).toEqual([
      { currency: 'EUR', total: 30, mine: 15 },
    ]);
  });
});
