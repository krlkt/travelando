import { describe, expect, it } from 'vitest';
import { computeBalances } from './balances';
import { computeMemberBreakdown } from './balanceBreakdown';
import type { Expense, Settlement, TripMember } from './types';

const tripId = 'trip-1';
const members: TripMember[] = [
  {
    id: 'm-a',
    tripId,
    displayName: 'Alice',
    userId: 'u-a',
    status: 'accepted',
  },
  { id: 'm-b', tripId, displayName: 'Bob', userId: 'u-b', status: 'accepted' },
  {
    id: 'm-c',
    tripId,
    displayName: 'Carol',
    userId: 'u-c',
    status: 'accepted',
  },
];

const dinner: Expense = {
  id: 'e-1',
  tripId,
  title: 'Dinner',
  amount: 90,
  currency: 'EUR',
  payerMemberId: 'm-a',
  spentOn: '2026-05-28',
  createdAt: '2026-05-28T00:00:00Z',
  category: 'restaurants',
  resolved: false,
  mode: 'equally',
  shares: [
    { memberId: 'm-a', value: null, locked: false },
    { memberId: 'm-b', value: null, locked: false },
    { memberId: 'm-c', value: null, locked: false },
  ],
};

const settlement: Settlement = {
  id: 's-1',
  tripId,
  fromMemberId: 'm-b',
  toMemberId: 'm-a',
  amount: 20,
  currency: 'EUR',
  settledOn: '2026-05-29',
};

describe('computeMemberBreakdown', () => {
  it('itemizes the payer fronting an expense and their own share', () => {
    const bd = computeMemberBreakdown([dinner], [], 'm-a');
    const eur = bd.byCurrency.find((c) => c.currency === 'EUR')!;
    expect(eur.expenses).toHaveLength(1);
    const line = eur.expenses[0];
    expect(line.isPayer).toBe(true);
    expect(line.paid).toBe(90);
    expect(line.share).toBeCloseTo(30);
    expect(line.net).toBeCloseTo(60);
    expect(eur.net).toBeCloseTo(60);
  });

  it('itemizes a participant who did not pay', () => {
    const bd = computeMemberBreakdown([dinner], [], 'm-b');
    const eur = bd.byCurrency.find((c) => c.currency === 'EUR')!;
    expect(eur.expenses[0].isPayer).toBe(false);
    expect(eur.expenses[0].paid).toBe(0);
    expect(eur.net).toBeCloseTo(-30);
  });

  it('includes settlements and flips net by direction', () => {
    const sender = computeMemberBreakdown([], [settlement], 'm-b');
    expect(sender.byCurrency[0].settlements[0].direction).toBe('sent');
    expect(sender.byCurrency[0].net).toBeCloseTo(20);

    const receiver = computeMemberBreakdown([], [settlement], 'm-a');
    expect(receiver.byCurrency[0].settlements[0].direction).toBe('received');
    expect(receiver.byCurrency[0].net).toBeCloseTo(-20);
  });

  it('reconciles exactly to computeBalances for every member', () => {
    const result = computeBalances([dinner], members, [settlement]);
    for (const member of members) {
      const bd = computeMemberBreakdown([dinner], [settlement], member.id);
      const balanceRow = result.balances
        .find((b) => b.memberId === member.id)!
        .byCurrency.find((c) => c.currency === 'EUR');
      const bdRow = bd.byCurrency.find((c) => c.currency === 'EUR');
      expect(bdRow?.net ?? 0).toBeCloseTo(balanceRow?.net ?? 0);
    }
  });

  it('excludes resolved expenses, matching the balance math', () => {
    const resolved: Expense = { ...dinner, resolved: true };
    const bd = computeMemberBreakdown([resolved], [], 'm-a');
    expect(bd.byCurrency).toHaveLength(0);
  });

  it('omits members with no involvement in an expense', () => {
    const twoWay: Expense = {
      ...dinner,
      shares: [
        { memberId: 'm-a', value: null, locked: false },
        { memberId: 'm-b', value: null, locked: false },
      ],
    };
    const bd = computeMemberBreakdown([twoWay], [], 'm-c');
    expect(bd.byCurrency).toHaveLength(0);
  });
});
