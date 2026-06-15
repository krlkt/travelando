/**
 * Per-trip persistence of the last-used "Paid by" and "Split with" inputs on the
 * expense form, so the next *new* expense pre-fills who paid and who it was
 * divided with instead of always defaulting to the first member / everyone.
 *
 * The pure resolvers below validate stored member ids against the trip's current
 * members (members can be retired/removed) and live here so they can be
 * unit-tested without a DOM — mirroring `activeDayStorage.ts`. The guarded
 * `read`/`write` IO mirrors `fx.ts`.
 */

const EXPENSE_DEFAULTS_PREFIX = 'travelando:expenseDefaults:';

export interface StoredExpenseDefaults {
  payerMemberId: string | null;
  selectedMemberIds: string[];
}

/** Build the `localStorage` key for a trip's last-used expense inputs. */
export function buildExpenseDefaultsKey(tripId: string): string {
  return `${EXPENSE_DEFAULTS_PREFIX}${tripId}`;
}

/** Read the stored defaults, returning `null` when unset, disabled, or invalid. */
export function readExpenseDefaults(
  tripId: string,
): StoredExpenseDefaults | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(buildExpenseDefaultsKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredExpenseDefaults;
    if (
      (parsed?.payerMemberId !== null &&
        typeof parsed?.payerMemberId !== 'string') ||
      !Array.isArray(parsed?.selectedMemberIds) ||
      !parsed.selectedMemberIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    return parsed;
  } catch {
    // localStorage unavailable (private mode / disabled) or unparseable.
    return null;
  }
}

/** Persist the last-used expense inputs. Write failures are ignored. */
export function writeExpenseDefaults(
  tripId: string,
  defaults: StoredExpenseDefaults,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      buildExpenseDefaultsKey(tripId),
      JSON.stringify(defaults),
    );
  } catch {
    // localStorage quota or disabled; ignore.
  }
}

interface ResolvePayerArgs {
  stored: StoredExpenseDefaults | null;
  memberIds: readonly string[];
  fallback: string;
}

/**
 * Choose the default payer: the stored payer wins when it is still a current
 * trip member, otherwise the caller's fallback (typically the first member).
 */
export function resolvePayerDefault({
  stored,
  memberIds,
  fallback,
}: ResolvePayerArgs): string {
  const payer = stored?.payerMemberId;
  if (payer && memberIds.includes(payer)) {
    return payer;
  }
  return fallback;
}

interface ResolveSelectionArgs {
  stored: StoredExpenseDefaults | null;
  memberIds: readonly string[];
}

/**
 * Choose the default split selection: the stored member ids that are still on
 * the trip. If nothing valid remains (no stored value, or all stored members
 * were retired), fall back to everyone — preserving the form's original
 * "split with all members" default.
 */
export function resolveSelectionDefault({
  stored,
  memberIds,
}: ResolveSelectionArgs): string[] {
  const valid = (stored?.selectedMemberIds ?? []).filter((id) =>
    memberIds.includes(id),
  );
  return valid.length > 0 ? valid : [...memberIds];
}
