import type { Expense, Settlement } from './types';

/**
 * Whether a member has a financial footprint on the trip — they paid an
 * expense, appear in any expense split, or are party to a settlement. Such a
 * member must be RETAINED (retired to name-only) when they leave, since
 * deleting their row would corrupt expense splits and balances. Mirrors the
 * footprint check in the `remove_trip_member` RPC.
 */
export function memberHasFootprint(
  memberId: string,
  expenses: Expense[],
  settlements: Settlement[],
): boolean {
  const inExpenses = expenses.some(
    (e) =>
      e.payerMemberId === memberId ||
      e.shares.some((s) => s.memberId === memberId),
  );
  if (inExpenses) return true;
  return settlements.some(
    (s) => s.fromMemberId === memberId || s.toMemberId === memberId,
  );
}

/**
 * Pick a name-only display name that does not collide with existing name-only
 * members (case-insensitive). Appends " (left)", then " (left 2)", " (left 3)"
 * … exactly as the `remove_trip_member` RPC does. `existingNames` should be the
 * display names of the trip's other name-only members.
 */
export function uniqueNameOnlyDisplayName(
  existingNames: string[],
  name: string,
): string {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;

  let candidate = `${name} (left)`;
  let suffix = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${name} (left ${suffix})`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Result of attempting to remove a member: either deleted outright (no
 * footprint) or retired into a name-only member whose row survives.
 */
export type RemoveMemberResult =
  | { retired: false }
  | { retired: true; member: import('./types').TripMember };
