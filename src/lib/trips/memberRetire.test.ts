import { describe, expect, it } from 'vitest';
import { memberHasFootprint, uniqueNameOnlyDisplayName } from './memberRetire';
import type { Expense, Settlement } from './types';

const tripId = 'trip-1';

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: 'e-1',
    tripId,
    title: 'Dinner',
    amount: 30,
    currency: 'EUR',
    payerMemberId: 'm-a',
    spentOn: '2026-06-01',
    createdAt: '2026-06-01T00:00:00Z',
    mode: 'equally',
    category: 'restaurants',
    resolved: false,
    shares: [
      { memberId: 'm-a', value: null, locked: false },
      { memberId: 'm-b', value: null, locked: false },
    ],
    ...overrides,
  };
}

function settlement(overrides: Partial<Settlement>): Settlement {
  return {
    id: 's-1',
    tripId,
    fromMemberId: 'm-b',
    toMemberId: 'm-a',
    amount: 15,
    currency: 'EUR',
    settledOn: '2026-06-02',
    ...overrides,
  };
}

describe('memberHasFootprint', () => {
  it('is true when the member paid an expense', () => {
    const result = memberHasFootprint('m-a', [expense({})], []);
    expect(result).toBe(true);
  });

  it('is true when the member only appears in a split', () => {
    const result = memberHasFootprint('m-b', [expense({})], []);
    expect(result).toBe(true);
  });

  it('is true when the member is party to a settlement', () => {
    const result = memberHasFootprint('m-b', [], [settlement({})]);
    expect(result).toBe(true);
  });

  it('is false when the member has no expenses or settlements', () => {
    const result = memberHasFootprint('m-z', [expense({})], [settlement({})]);
    expect(result).toBe(false);
  });

  it('is false with no data at all', () => {
    expect(memberHasFootprint('m-a', [], [])).toBe(false);
  });
});

describe('uniqueNameOnlyDisplayName', () => {
  it('returns the name unchanged when there is no collision', () => {
    expect(uniqueNameOnlyDisplayName(['Bob'], 'Marta')).toBe('Marta');
  });

  it('appends " (left)" on the first collision', () => {
    expect(uniqueNameOnlyDisplayName(['Marta'], 'Marta')).toBe('Marta (left)');
  });

  it('is case-insensitive when detecting collisions', () => {
    expect(uniqueNameOnlyDisplayName(['marta'], 'Marta')).toBe('Marta (left)');
  });

  it('increments the suffix past an existing " (left)"', () => {
    expect(uniqueNameOnlyDisplayName(['Marta', 'Marta (left)'], 'Marta')).toBe(
      'Marta (left 2)',
    );
  });

  it('keeps incrementing until a free name is found', () => {
    const existing = ['Marta', 'Marta (left)', 'Marta (left 2)'];
    expect(uniqueNameOnlyDisplayName(existing, 'Marta')).toBe('Marta (left 3)');
  });
});
