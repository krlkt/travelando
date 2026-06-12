/**
 * Itinerary times are "floating" wall-clock values (`YYYY-MM-DDTHH:MM[:SS]`
 * or date-only `YYYY-MM-DD`) — the local time at the place where something
 * happens. They carry no timezone and must never shift with the viewer's
 * device timezone.
 *
 * `parseNaive` maps a value onto the device clock purely for comparison and
 * formatting. Never call `toISOString()` on the result — that re-introduces
 * the timezone conversion this module exists to avoid; use `toNaiveString`.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** Drops a trailing `Z` or `±HH:MM` offset left over from legacy ISO instants. */
export function stripOffset(value: string): string {
  return value.replace(/(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/i, '');
}

/**
 * Parses a floating wall-time string into a Date by components, so date-only
 * values land on local midnight (the bare `new Date('YYYY-MM-DD')` parses as
 * UTC midnight and shifts the day in some timezones).
 */
export function parseNaive(value: string): Date {
  const v = stripOffset(value);
  const [datePart, timePart = ''] = v.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss);
}

/** Formats a Date's wall-clock reading as a floating `YYYY-MM-DDTHH:MM`. */
export function toNaiveString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
