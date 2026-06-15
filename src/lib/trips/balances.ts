import type { Expense, ExpenseShare, Settlement, TripMember } from './types';

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

/**
 * The given member's share of a single expense in its native currency.
 * Returns 0 when the member isn't part of the split.
 */
export function shareForMember(
  expense: Expense,
  memberId: string | null,
): number {
  if (!memberId) return 0;
  return expandShares(expense).find((s) => s.memberId === memberId)?.share ?? 0;
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
  settlements: Settlement[] = [],
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
    // Resolved expenses were already settled member-by-member at the time, so
    // they don't affect who owes whom. They still count toward spending totals
    // elsewhere — only the settlement math skips them.
    if (expense.resolved) continue;
    const code = expense.currency.toUpperCase();
    const payerAcc = bucketFor(expense.payerMemberId, code);
    payerAcc.paid += expense.amount;

    const expanded = expandShares(expense);
    for (const row of expanded) {
      const acc = bucketFor(row.memberId, code);
      acc.owed += row.share;
    }
  }

  // Settlements net into the same per-currency buckets. The sender's net rises
  // by `amount` (they paid out real money) and the receiver's net falls by
  // `amount` (their outstanding credit was consumed).
  for (const settlement of settlements) {
    const code = settlement.currency.toUpperCase();
    bucketFor(settlement.fromMemberId, code).paid += settlement.amount;
    bucketFor(settlement.toMemberId, code).owed += settlement.amount;
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
 * Distinct currencies touched anywhere in the trip's balances, sorted
 * alphabetically. Used to populate the currency picker when recording a
 * settlement that isn't tied to a specific balance row.
 */
export function tripCurrencies(result: BalancesResult): string[] {
  const seen = new Set<string>();
  for (const balance of result.balances) {
    for (const row of balance.byCurrency) {
      seen.add(row.currency);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * A directed debt: `from` should pay `to` `amount` in `currency` to settle.
 * Derived from net balances, so it does not map 1:1 to any single expense.
 */
export interface DebtTransaction {
  fromMemberId: string;
  toMemberId: string;
  currency: string;
  amount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Reduce per-currency net balances to a minimal set of directed transfers
 * that settle everyone ("who owes whom"). For each currency independently,
 * greedily matches the largest debtor to the largest creditor until all nets
 * fall within `SETTLED_EPSILON`.
 *
 * This minimises the number of transfers, so a resulting debt may pair two
 * members who never directly split an expense — the same any-to-any model the
 * Settle sheet uses. Ordering is deterministic: nets are matched by descending
 * magnitude with a stable `memberId` tie-break.
 */
export function simplifyDebts(result: BalancesResult): DebtTransaction[] {
  const byCurrency = new Map<string, Map<string, number>>();
  for (const balance of result.balances) {
    for (const row of balance.byCurrency) {
      if (Math.abs(row.net) < SETTLED_EPSILON) continue;
      const nets = byCurrency.get(row.currency) ?? new Map<string, number>();
      if (!byCurrency.has(row.currency)) byCurrency.set(row.currency, nets);
      nets.set(balance.memberId, row.net);
    }
  }

  const transactions: DebtTransaction[] = [];
  const currencies = [...byCurrency.keys()].sort((a, b) => a.localeCompare(b));

  for (const currency of currencies) {
    const nets = byCurrency.get(currency)!;
    // Mutable working copies: creditors (net > 0), debtors (net < 0).
    const creditors = [...nets.entries()]
      .filter(([, net]) => net > 0)
      .map(([memberId, net]) => ({ memberId, amount: net }));
    const debtors = [...nets.entries()]
      .filter(([, net]) => net < 0)
      .map(([memberId, net]) => ({ memberId, amount: -net }));

    const sortByAmount = (
      a: { memberId: string; amount: number },
      b: { memberId: string; amount: number },
    ) => b.amount - a.amount || a.memberId.localeCompare(b.memberId);

    while (creditors.length > 0 && debtors.length > 0) {
      creditors.sort(sortByAmount);
      debtors.sort(sortByAmount);
      const creditor = creditors[0];
      const debtor = debtors[0];
      const settled = Math.min(creditor.amount, debtor.amount);

      transactions.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        currency,
        amount: round2(settled),
      });

      creditor.amount -= settled;
      debtor.amount -= settled;
      if (creditor.amount < SETTLED_EPSILON) creditors.shift();
      if (debtor.amount < SETTLED_EPSILON) debtors.shift();
    }
  }

  return transactions.filter((t) => t.amount >= SETTLED_EPSILON);
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
