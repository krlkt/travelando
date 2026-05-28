import type { Expense, ExpenseShare, TripMember } from './types';

export interface ExpandedShare {
  memberId: string;
  share: number;
}

export interface CurrencyBalance {
  currency: string;
  paid: number;
  owed: number;
  net: number;
}

export interface MemberBalance {
  memberId: string;
  byCurrency: CurrencyBalance[];
}

export interface BalancesResult {
  balances: MemberBalance[];
}

export interface UserSummaryEntry {
  kind: 'owed' | 'owes';
  currency: string;
  amount: number;
}

export type UserSummary =
  | { kind: 'settled'; counterpartyCount: 0 }
  | {
      kind: 'mixed';
      entries: UserSummaryEntry[];
      counterpartyCount: number;
    };

const SETTLED_EPSILON = 0.005;

/**
 * Distribute an expense's amount across the share rows according to its mode.
 * Returns a per-member share in the expense's native currency (no FX).
 *
 * - `equally`: amount / shares.length
 * - `parts`:   (value / sum(values)) * amount
 * - `amounts`: locked rows return their `value`; unlocked rows split the
 *              remainder evenly. The editor is responsible for validating
 *              that locked totals sum to `amount` when no unlocked rows
 *              remain — this function does not enforce that invariant.
 */
export function expandShares(expense: Expense): ExpandedShare[] {
  const { amount, shares, mode } = expense;
  if (shares.length === 0) return [];

  if (mode === 'equally') {
    const each = amount / shares.length;
    return shares.map((s) => ({ memberId: s.memberId, share: each }));
  }

  if (mode === 'parts') {
    const totalParts = shares.reduce((sum, s) => sum + (s.value ?? 0), 0);
    if (totalParts <= 0) {
      const each = amount / shares.length;
      return shares.map((s) => ({ memberId: s.memberId, share: each }));
    }
    return shares.map((s) => ({
      memberId: s.memberId,
      share: ((s.value ?? 0) / totalParts) * amount,
    }));
  }

  // mode === 'amounts'
  const pinnedTotal = shares
    .filter((s) => s.locked)
    .reduce((sum, s) => sum + (s.value ?? 0), 0);
  const unlocked = shares.filter((s) => !s.locked);
  const remainder = amount - pinnedTotal;
  const perUnlocked = unlocked.length > 0 ? remainder / unlocked.length : 0;

  return shares.map((s) => ({
    memberId: s.memberId,
    share: s.locked ? (s.value ?? 0) : perUnlocked,
  }));
}

interface CurrencyAcc {
  paid: number;
  owed: number;
}

function emptyAcc(): CurrencyAcc {
  return { paid: 0, owed: 0 };
}

/**
 * Compute per-member balances split by currency (no FX). Each member gets a
 * `byCurrency` list with `paid`, `owed`, and `net` in that native currency.
 * Currencies are listed only when the member touched them.
 */
export function computeBalances(
  expenses: Expense[],
  members: TripMember[],
): BalancesResult {
  // memberId -> currency -> { paid, owed }
  const perMember = new Map<string, Map<string, CurrencyAcc>>();
  for (const member of members) {
    perMember.set(member.id, new Map());
  }

  function bucketFor(memberId: string, currency: string): CurrencyAcc {
    const byCurrency =
      perMember.get(memberId) ?? new Map<string, CurrencyAcc>();
    if (!perMember.has(memberId)) perMember.set(memberId, byCurrency);
    const acc = byCurrency.get(currency) ?? emptyAcc();
    if (!byCurrency.has(currency)) byCurrency.set(currency, acc);
    return acc;
  }

  for (const expense of expenses) {
    const code = expense.currency.toUpperCase();
    const payerAcc = bucketFor(expense.payerMemberId, code);
    payerAcc.paid += expense.amount;

    const expanded = expandShares(expense);
    for (const row of expanded) {
      const acc = bucketFor(row.memberId, code);
      acc.owed += row.share;
    }
  }

  const balances: MemberBalance[] = members.map((member) => {
    const byCurrency =
      perMember.get(member.id) ?? new Map<string, CurrencyAcc>();
    const rows: CurrencyBalance[] = [...byCurrency.entries()]
      .map(([currency, acc]) => ({
        currency,
        paid: acc.paid,
        owed: acc.owed,
        net: acc.paid - acc.owed,
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
    return { memberId: member.id, byCurrency: rows };
  });

  return { balances };
}

/**
 * Resolve the current user's member id from the trip members list.
 */
export function findMemberIdForUser(
  members: TripMember[],
  currentUserId: string | null | undefined,
): string | null {
  if (!currentUserId) return null;
  return members.find((m) => m.userId === currentUserId)?.id ?? null;
}

function memberHasOpenBalance(member: MemberBalance): boolean {
  return member.byCurrency.some((c) => Math.abs(c.net) >= SETTLED_EPSILON);
}

/**
 * Summarize the headline status for the current user on the Balances tab.
 * Returns `settled` when no per-currency net exceeds the epsilon, otherwise
 * `mixed` with one entry per currency where the user has a non-trivial net
 * plus how many counterparties they share any non-trivial balance with.
 */
export function summarizeForUser(
  result: BalancesResult,
  currentMemberId: string | null,
): UserSummary {
  const { balances } = result;
  const anyOpen = balances.some(memberHasOpenBalance);
  if (!anyOpen) {
    return { kind: 'settled', counterpartyCount: 0 };
  }

  if (!currentMemberId) {
    return { kind: 'settled', counterpartyCount: 0 };
  }

  const self = balances.find((b) => b.memberId === currentMemberId);
  if (!self || !memberHasOpenBalance(self)) {
    return { kind: 'settled', counterpartyCount: 0 };
  }

  const entries: UserSummaryEntry[] = self.byCurrency
    .filter((c) => Math.abs(c.net) >= SETTLED_EPSILON)
    .map<UserSummaryEntry>((c) => ({
      kind: c.net > 0 ? 'owed' : 'owes',
      currency: c.currency,
      amount: Math.abs(c.net),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const counterpartyCount = balances.filter(
    (b) => b.memberId !== currentMemberId && memberHasOpenBalance(b),
  ).length;

  return { kind: 'mixed', entries, counterpartyCount };
}

export type { ExpenseShare };
