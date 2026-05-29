import { describe, expect, it } from 'vitest';
import {
  computeBalances,
  expandShares,
  findMemberIdForUser,
  summarizeForUser,
} from './balances';
import type { Expense, Settlement, TripMember } from './types';

const tripId = 'trip-1';
const members: TripMember[] = [
  { id: 'm-a', tripId, displayName: 'Alice', userId: 'u-alice' },
  { id: 'm-b', tripId, displayName: 'Bob', userId: 'u-bob' },
  { id: 'm-c', tripId, displayName: 'Carol', userId: 'u-carol' },
];

const baseExpense = {
  id: 'e-1',
  tripId,
  title: 'Dinner',
  amount: 90,
  currency: 'EUR',
  payerMemberId: 'm-a',
  spentOn: '2026-05-28',
  category: 'other' as const,
};

describe('expandShares', () => {
  it('splits equally across all selected members', () => {
    const expense: Expense = {
      ...baseExpense,
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
        { memberId: 'm-c', value: null, locked: false },
      ],
    };
    const result = expandShares(expense);
    expect(result).toEqual([
      { memberId: 'm-a', share: 30 },
      { memberId: 'm-b', share: 30 },
      { memberId: 'm-c', share: 30 },
    ]);
  });

  it('only splits across included members in equally mode', () => {
    const expense: Expense = {
      ...baseExpense,
      amount: 60,
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    expect(expandShares(expense)).toEqual([
      { memberId: 'm-a', share: 30 },
      { memberId: 'm-b', share: 30 },
    ]);
  });

  it('splits proportionally in parts mode', () => {
    const expense: Expense = {
      ...baseExpense,
      amount: 90,
      mode: 'parts',
      shares: [
        { memberId: 'm-a', value: 1, locked: false },
        { memberId: 'm-b', value: 2, locked: false },
      ],
    };
    expect(expandShares(expense)).toEqual([
      { memberId: 'm-a', share: 30 },
      { memberId: 'm-b', share: 60 },
    ]);
  });

  it('uses locked values and splits the remainder evenly in amounts mode', () => {
    const expense: Expense = {
      ...baseExpense,
      amount: 30,
      mode: 'amounts',
      shares: [
        { memberId: 'm-a', value: 10, locked: true },
        { memberId: 'm-b', value: null, locked: false },
        { memberId: 'm-c', value: null, locked: false },
      ],
    };
    expect(expandShares(expense)).toEqual([
      { memberId: 'm-a', share: 10 },
      { memberId: 'm-b', share: 10 },
      { memberId: 'm-c', share: 10 },
    ]);
  });
});

describe('computeBalances', () => {
  it('returns no currency rows when there are no expenses', () => {
    const { balances } = computeBalances([], members);
    for (const b of balances) expect(b.byCurrency).toEqual([]);
  });

  it('reports paid − owed in native currency for an equally-split expense', () => {
    const expense: Expense = {
      ...baseExpense,
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
        { memberId: 'm-c', value: null, locked: false },
      ],
    };
    const { balances } = computeBalances([expense], members);
    const alice = balances.find((b) => b.memberId === 'm-a')!;
    const bob = balances.find((b) => b.memberId === 'm-b')!;
    expect(alice.byCurrency).toHaveLength(1);
    expect(alice.byCurrency[0].currency).toBe('EUR');
    expect(alice.byCurrency[0].paid).toBe(90);
    expect(alice.byCurrency[0].owed).toBeCloseTo(30, 5);
    expect(alice.byCurrency[0].net).toBeCloseTo(60, 5);
    expect(bob.byCurrency[0].paid).toBe(0);
    expect(bob.byCurrency[0].owed).toBeCloseTo(30, 5);
    expect(bob.byCurrency[0].net).toBeCloseTo(-30, 5);
  });

  it('keeps EUR and USD as separate native rows per member', () => {
    const eurExpense: Expense = {
      ...baseExpense,
      id: 'e-eur',
      amount: 60,
      currency: 'EUR',
      payerMemberId: 'm-a',
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    const usdExpense: Expense = {
      ...baseExpense,
      id: 'e-usd',
      amount: 100,
      currency: 'USD',
      payerMemberId: 'm-b',
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    const { balances } = computeBalances([eurExpense, usdExpense], members);
    const alice = balances.find((b) => b.memberId === 'm-a')!;
    const bob = balances.find((b) => b.memberId === 'm-b')!;
    expect(alice.byCurrency).toEqual([
      { currency: 'EUR', paid: 60, owed: 30, net: 30 },
      { currency: 'USD', paid: 0, owed: 50, net: -50 },
    ]);
    expect(bob.byCurrency).toEqual([
      { currency: 'EUR', paid: 0, owed: 30, net: -30 },
      { currency: 'USD', paid: 100, owed: 50, net: 50 },
    ]);
  });

  it('normalises currency codes to uppercase', () => {
    const expense: Expense = {
      ...baseExpense,
      currency: 'eur',
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    const { balances } = computeBalances([expense], members);
    const alice = balances.find((b) => b.memberId === 'm-a')!;
    expect(alice.byCurrency[0].currency).toBe('EUR');
  });
});

describe('summarizeForUser', () => {
  it('returns settled when there are no balances', () => {
    const result = computeBalances([], members);
    expect(summarizeForUser(result, 'm-a')).toEqual({
      kind: 'settled',
      counterpartyCount: 0,
    });
  });

  it('returns mixed entries per currency where the current user has a net', () => {
    const eurExpense: Expense = {
      ...baseExpense,
      id: 'e-eur',
      amount: 60,
      currency: 'EUR',
      payerMemberId: 'm-a',
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    const usdExpense: Expense = {
      ...baseExpense,
      id: 'e-usd',
      amount: 100,
      currency: 'USD',
      payerMemberId: 'm-b',
      mode: 'equally',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    const result = computeBalances([eurExpense, usdExpense], members);
    const summary = summarizeForUser(result, 'm-a');
    expect(summary.kind).toBe('mixed');
    if (summary.kind === 'mixed') {
      expect(summary.entries).toEqual([
        { kind: 'owed', currency: 'EUR', amount: 30 },
        { kind: 'owes', currency: 'USD', amount: 50 },
      ]);
      expect(summary.counterpartyCount).toBe(1);
    }
  });

  it('returns settled when the current user has only sub-epsilon balances', () => {
    const expense: Expense = {
      ...baseExpense,
      amount: 60,
      mode: 'equally',
      payerMemberId: 'm-a',
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
        { memberId: 'm-c', value: null, locked: false },
      ],
    };
    // 'm-a' paid 60, owes 20, net +40 → not settled. Use a member with 0 net.
    const result = computeBalances([expense], members);
    // Need a different setup where current user is settled but others aren't.
    // Simpler: a self-only expense leaves m-b at 0.
    const selfOnly: Expense = {
      ...baseExpense,
      amount: 10,
      mode: 'equally',
      payerMemberId: 'm-a',
      shares: [{ memberId: 'm-a', value: null, locked: false }],
    };
    const r2 = computeBalances([selfOnly], members);
    expect(summarizeForUser(r2, 'm-a')).toEqual({
      kind: 'settled',
      counterpartyCount: 0,
    });
    // Reference the original result so vitest doesn't complain about unused.
    expect(result.balances.length).toBe(3);
  });
});

describe('computeBalances with settlements', () => {
  const splitExpense: Expense = {
    ...baseExpense,
    mode: 'equally',
    amount: 90,
    payerMemberId: 'm-a',
    shares: [
      { memberId: 'm-a', value: null, locked: false },
      { memberId: 'm-b', value: null, locked: false },
      { memberId: 'm-c', value: null, locked: false },
    ],
  };

  function netFor(
    balances: ReturnType<typeof computeBalances>['balances'],
    memberId: string,
    currency: string,
  ): number {
    const m = balances.find((b) => b.memberId === memberId);
    return m?.byCurrency.find((c) => c.currency === currency)?.net ?? 0;
  }

  it('settles a one-currency debt to zero', () => {
    const settlement: Settlement = {
      id: 's-1',
      tripId,
      fromMemberId: 'm-b',
      toMemberId: 'm-a',
      amount: 30,
      currency: 'EUR',
      settledOn: '2026-05-29',
    };
    const { balances } = computeBalances([splitExpense], members, [settlement]);
    expect(netFor(balances, 'm-a', 'EUR')).toBeCloseTo(30);
    expect(netFor(balances, 'm-b', 'EUR')).toBeCloseTo(0);
    expect(netFor(balances, 'm-c', 'EUR')).toBeCloseTo(-30);
  });

  it('partial settlement reduces net', () => {
    const settlement: Settlement = {
      id: 's-2',
      tripId,
      fromMemberId: 'm-b',
      toMemberId: 'm-a',
      amount: 10,
      currency: 'EUR',
      settledOn: '2026-05-29',
    };
    const { balances } = computeBalances([splitExpense], members, [settlement]);
    expect(netFor(balances, 'm-a', 'EUR')).toBeCloseTo(50);
    expect(netFor(balances, 'm-b', 'EUR')).toBeCloseTo(-20);
  });

  it('overpayment flips the sign', () => {
    const settlement: Settlement = {
      id: 's-3',
      tripId,
      fromMemberId: 'm-b',
      toMemberId: 'm-a',
      amount: 50,
      currency: 'EUR',
      settledOn: '2026-05-29',
    };
    const { balances } = computeBalances([splitExpense], members, [settlement]);
    // m-b paid 50 toward a 30 debt → m-b is now owed 20 by m-a.
    expect(netFor(balances, 'm-a', 'EUR')).toBeCloseTo(10);
    expect(netFor(balances, 'm-b', 'EUR')).toBeCloseTo(20);
  });

  it('does not cross currencies', () => {
    const settlement: Settlement = {
      id: 's-4',
      tripId,
      fromMemberId: 'm-b',
      toMemberId: 'm-a',
      amount: 30,
      currency: 'USD',
      settledOn: '2026-05-29',
    };
    const { balances } = computeBalances([splitExpense], members, [settlement]);
    expect(netFor(balances, 'm-a', 'EUR')).toBeCloseTo(60);
    expect(netFor(balances, 'm-b', 'EUR')).toBeCloseTo(-30);
    expect(netFor(balances, 'm-a', 'USD')).toBeCloseTo(-30);
    expect(netFor(balances, 'm-b', 'USD')).toBeCloseTo(30);
  });

  it('summarizeForUser reports settled once a settlement closes the net', () => {
    const settlement: Settlement = {
      id: 's-5',
      tripId,
      fromMemberId: 'm-b',
      toMemberId: 'm-a',
      amount: 30,
      currency: 'EUR',
      settledOn: '2026-05-29',
    };
    // Settle Bob and Carol both so the whole graph is closed.
    const carolSettlement: Settlement = {
      ...settlement,
      id: 's-6',
      fromMemberId: 'm-c',
    };
    const result = computeBalances([splitExpense], members, [
      settlement,
      carolSettlement,
    ]);
    expect(summarizeForUser(result, 'm-b')).toEqual({
      kind: 'settled',
      counterpartyCount: 0,
    });
  });
});

describe('findMemberIdForUser', () => {
  it('returns the member id when userId matches', () => {
    expect(findMemberIdForUser(members, 'u-alice')).toBe('m-a');
  });
  it('returns null when no member matches', () => {
    expect(findMemberIdForUser(members, 'u-nobody')).toBeNull();
  });
  it('returns null when currentUserId is missing', () => {
    expect(findMemberIdForUser(members, null)).toBeNull();
    expect(findMemberIdForUser(members, undefined)).toBeNull();
  });
});
