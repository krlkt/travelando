/**
 * Per-trip persistence of the last-opened day tab on the trip detail page.
 *
 * Day keys are stable `YYYY-MM-DD` strings (see `dayKey` in
 * `@/lib/time/formatDate`), so a stored value survives refreshes and tab
 * reordering. The selection logic lives here as pure functions so it can be
 * unit-tested without a DOM.
 */

const ACTIVE_DAY_PREFIX = 'travelando:activeDay:';

/** Build the `localStorage` key for a trip's last-opened day. */
export function buildActiveDayKey(tripId: string): string {
  return `${ACTIVE_DAY_PREFIX}${tripId}`;
}

interface PickInitialDayArgs {
  stored: string | null;
  validKeys: readonly string[];
  fallback: string;
}

/**
 * Choose which day tab to open. A stored day wins when it is still a valid day
 * for the trip; otherwise we fall back to the caller's default (current day for
 * an ongoing trip, else the first day).
 */
export function pickInitialDay({
  stored,
  validKeys,
  fallback,
}: PickInitialDayArgs): string {
  if (stored && validKeys.includes(stored)) {
    return stored;
  }
  return fallback;
}
