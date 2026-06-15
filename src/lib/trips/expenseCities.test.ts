import { describe, it, expect } from 'vitest';
import { resolveExpenseCities } from './expenseCities';
import type { CityOverride, Expense, Trip, TripItem } from './types';

function makeTrip(items: TripItem[] = []): Trip {
  return {
    id: 'trip-1',
    title: 'Test trip',
    destination: 'Amsterdam',
    coverGradient: 'linear-gradient(#000, #fff)',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    members: [],
    items,
  };
}

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e-1',
    tripId: 'trip-1',
    title: 'Coffee',
    amount: 10,
    currency: 'EUR',
    payerMemberId: 'm-a',
    spentOn: '2026-06-01',
    createdAt: '2026-06-01T08:00:00Z',
    mode: 'equally',
    category: 'other',
    shares: [{ memberId: 'm-a', value: null, locked: false }],
    ...overrides,
  };
}

function transport(partial: Partial<TripItem>): TripItem {
  return {
    id: 'i-1',
    tripId: 'trip-1',
    kind: 'transport',
    title: 'Move',
    startsAt: '2026-06-02T09:00:00.000Z',
    endsAt: '2026-06-02T11:00:00.000Z',
    ...partial,
  };
}

describe('resolveExpenseCities', () => {
  it('returns no groups for no expenses', () => {
    const result = resolveExpenseCities([], makeTrip());
    expect(result.groups).toEqual([]);
    expect(result.keyByExpenseId.size).toBe(0);
  });

  it('attributes expenses to the trip destination by default', () => {
    const result = resolveExpenseCities(
      [expense({ id: 'e-1' }), expense({ id: 'e-2', spentOn: '2026-06-02' })],
      makeTrip(),
    );
    expect(result.groups).toEqual([
      { key: 'Amsterdam', label: 'Amsterdam', count: 2 },
    ]);
    expect(result.keyByExpenseId.get('e-1')).toBe('Amsterdam');
    expect(result.keyByExpenseId.get('e-2')).toBe('Amsterdam');
  });

  it('splits expenses across cities after a city-change transport', () => {
    const trip = makeTrip([
      transport({
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Paris' },
      }),
    ]);
    // 06-01 stays Amsterdam; 06-02 onward ends in Paris.
    const result = resolveExpenseCities(
      [
        expense({ id: 'before', spentOn: '2026-06-01' }),
        expense({ id: 'arrival', spentOn: '2026-06-02' }),
        expense({ id: 'after', spentOn: '2026-06-03' }),
      ],
      trip,
    );
    expect(result.keyByExpenseId.get('before')).toBe('Amsterdam');
    expect(result.keyByExpenseId.get('arrival')).toBe('Paris');
    expect(result.keyByExpenseId.get('after')).toBe('Paris');
    // Ordered by descending count: Paris (2) before Amsterdam (1).
    expect(result.groups.map((g) => g.label)).toEqual(['Paris', 'Amsterdam']);
  });

  it('honours city overrides', () => {
    const override: CityOverride = {
      id: 'o-1',
      tripId: 'trip-1',
      dayKey: '2026-06-02',
      cityLabel: 'Rotterdam',
    };
    const result = resolveExpenseCities(
      [expense({ id: 'e-1', spentOn: '2026-06-02' })],
      makeTrip(),
      [override],
    );
    expect(result.keyByExpenseId.get('e-1')).toBe('Rotterdam');
  });

  it('keys cities by place id when available', () => {
    const trip = makeTrip([
      transport({
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Paris', placeId: 'place-paris' },
      }),
    ]);
    const result = resolveExpenseCities(
      [expense({ id: 'e-1', spentOn: '2026-06-03' })],
      trip,
    );
    expect(result.keyByExpenseId.get('e-1')).toBe('place-paris');
    expect(result.groups[0]).toEqual({
      key: 'place-paris',
      label: 'Paris',
      count: 1,
    });
  });
});
