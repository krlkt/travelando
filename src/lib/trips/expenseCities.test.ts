import { describe, it, expect } from 'vitest';
import { resolveExpenseCities, UNDETECTED_CITY_KEY } from './expenseCities';
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
    resolved: false,
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

  it('buckets expenses with no detectable city as Undetectable', () => {
    const result = resolveExpenseCities(
      [expense({ id: 'e-1' }), expense({ id: 'e-2', spentOn: '2026-06-02' })],
      makeTrip(),
    );
    expect(result.groups).toEqual([
      { key: UNDETECTED_CITY_KEY, label: 'Undetectable', count: 2 },
    ]);
    expect(result.keyByExpenseId.get('e-1')).toBe(UNDETECTED_CITY_KEY);
    expect(result.keyByExpenseId.get('e-2')).toBe(UNDETECTED_CITY_KEY);
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
    // 06-01 is still the baseline destination (no real city pinned), so it
    // buckets as Undetectable rather than an Amsterdam chip.
    expect(result.keyByExpenseId.get('before')).toBe(UNDETECTED_CITY_KEY);
    expect(result.keyByExpenseId.get('arrival')).toBe('Paris');
    expect(result.keyByExpenseId.get('after')).toBe('Paris');
    // Ordered by descending count: Paris (2) before Undetectable (1).
    expect(result.groups.map((g) => g.label)).toEqual([
      'Paris',
      'Undetectable',
    ]);
  });

  it("resolves an expense to its linked item's city over its spent date", () => {
    const trip = makeTrip([
      transport({
        id: 'move',
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Paris' },
      }),
      {
        id: 'paris-act',
        tripId: 'trip-1',
        kind: 'activity',
        title: 'Louvre',
        startsAt: '2026-06-03T10:00:00.000Z',
        endsAt: '2026-06-03T12:00:00.000Z',
      },
    ]);
    const result = resolveExpenseCities(
      // Paid on 06-01 (baseline → Undetectable), but linked to the Paris activity.
      [expense({ id: 'e-1', itemId: 'paris-act', spentOn: '2026-06-01' })],
      trip,
    );
    expect(result.keyByExpenseId.get('e-1')).toBe('Paris');
  });

  it('buckets an expense linked to a city-change transport as Undetectable', () => {
    const trip = makeTrip([
      transport({
        id: 'move',
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Paris' },
      }),
    ]);
    const result = resolveExpenseCities(
      // Linked to the in-transit Amsterdam→Paris leg, not to either city.
      [expense({ id: 'e-1', itemId: 'move', spentOn: '2026-06-02' })],
      trip,
    );
    expect(result.keyByExpenseId.get('e-1')).toBe(UNDETECTED_CITY_KEY);
  });

  it('keeps an expense linked to a same-city transport on its segment city', () => {
    const trip = makeTrip([
      transport({
        id: 'arrive',
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Paris' },
      }),
      transport({
        id: 'metro',
        fromCity: { label: 'Paris' },
        toCity: { label: 'Paris' },
        startsAt: '2026-06-03T09:00:00.000Z',
        endsAt: '2026-06-03T09:30:00.000Z',
      }),
    ]);
    const result = resolveExpenseCities(
      [expense({ id: 'e-1', itemId: 'metro', spentOn: '2026-06-03' })],
      trip,
    );
    expect(result.keyByExpenseId.get('e-1')).toBe('Paris');
  });

  it('respects a city override when resolving a linked item', () => {
    const trip = makeTrip([
      {
        id: 'day2-act',
        tripId: 'trip-1',
        kind: 'activity',
        title: 'Market',
        startsAt: '2026-06-02T10:00:00.000Z',
        endsAt: '2026-06-02T12:00:00.000Z',
      },
    ]);
    const override: CityOverride = {
      id: 'o-1',
      tripId: 'trip-1',
      dayKey: '2026-06-02',
      cityLabel: 'Rotterdam',
    };
    const result = resolveExpenseCities(
      [expense({ id: 'e-1', itemId: 'day2-act', spentOn: '2026-06-01' })],
      trip,
      [override],
    );
    expect(result.keyByExpenseId.get('e-1')).toBe('Rotterdam');
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
