/**
 * Opening-hours logic for Google Places `regularOpeningHours`.
 *
 * Google reports hours in the *place's* local time, with `day` following JS
 * conventions (0 = Sunday … 6 = Saturday). Itinerary times in this app are
 * floating wall-clock values (see `lib/time/naive`), so a planned slot's
 * weekday + time can be compared against these hours directly — no timezone
 * conversion. For a generic "open now" we shift the device clock by the place's
 * `utcOffsetMinutes` to read its local wall time instead.
 *
 * All functions here are pure.
 */

export interface OpeningHoursPoint {
  /** 0 = Sunday … 6 = Saturday. */
  day: number;
  hour: number;
  minute: number;
}

export interface OpeningHoursPeriod {
  open: OpeningHoursPoint;
  /** Absent means "open from `open` onward" — Google's 24/7 marker. */
  close?: OpeningHoursPoint;
}

export interface RegularOpeningHours {
  periods?: OpeningHoursPeriod[];
  /** Human-readable per-day lines, e.g. "Monday: 9:00 AM – 5:00 PM". */
  weekdayDescriptions?: string[];
}

export type OpenState = 'open' | 'closed' | 'unknown';

const WEEK_MINUTES = 7 * 24 * 60;

/** Minutes from the start of the week (Sunday 00:00) for an hours point. */
function pointToWeekMinute(p: OpeningHoursPoint): number {
  return (
    (((p.day % 7) * 24 + p.hour) * 60 + p.minute + WEEK_MINUTES) % WEEK_MINUTES
  );
}

/**
 * Normalizes periods into `[start, end)` week-minute intervals. Overnight and
 * week-wrapping periods get an `end` past `WEEK_MINUTES`; a period with no
 * `close` is Google's all-day marker and becomes the full week.
 */
function toIntervals(
  periods: readonly OpeningHoursPeriod[],
): Array<[number, number]> {
  const intervals: Array<[number, number]> = [];
  for (const period of periods) {
    if (!period.open) continue;
    const start = pointToWeekMinute(period.open);
    if (!period.close) {
      intervals.push([0, WEEK_MINUTES]);
      continue;
    }
    let end = pointToWeekMinute(period.close);
    // A close at/behind the open means the period runs past midnight (or wraps
    // the week boundary), so push it into the following cycle.
    if (end <= start) end += WEEK_MINUTES;
    intervals.push([start, end]);
  }
  return intervals;
}

/** Week-minute (0…10079) of a Date read in its own wall-clock fields. */
export function weekMinuteOf(date: Date): number {
  return (date.getDay() * 24 + date.getHours()) * 60 + date.getMinutes();
}

/** Whether the place is open at a given week-minute. `unknown` if no data. */
export function isOpenAtWeekMinute(
  hours: RegularOpeningHours | undefined,
  weekMinute: number,
): OpenState {
  if (!hours?.periods || hours.periods.length === 0) return 'unknown';
  const intervals = toIntervals(hours.periods);
  if (intervals.length === 0) return 'unknown';

  for (const [start, end] of intervals) {
    // Check both this cycle and the previous one, so an interval that wrapped
    // past midnight still covers early-morning minutes.
    if (
      (weekMinute >= start && weekMinute < end) ||
      (weekMinute + WEEK_MINUTES >= start && weekMinute + WEEK_MINUTES < end)
    ) {
      return 'open';
    }
  }
  return 'closed';
}

/**
 * Open state at a floating wall-time slot (e.g. a planned itinerary item).
 * Only the Date's wall-clock fields are read, so the device timezone is
 * irrelevant — matching the destination-local time the user planned.
 */
export function openStateAtWallTime(
  hours: RegularOpeningHours | undefined,
  wallTime: Date,
): OpenState {
  return isOpenAtWeekMinute(hours, weekMinuteOf(wallTime));
}

/**
 * Open state right now in the *place's* local time. Shifts the UTC instant by
 * `utcOffsetMinutes` and reads the result's UTC fields to get destination wall
 * time. Falls back to the device clock when the offset is unknown.
 */
export function openStateNow(
  hours: RegularOpeningHours | undefined,
  utcOffsetMinutes: number | undefined,
  now: Date = new Date(),
): OpenState {
  if (utcOffsetMinutes == null) {
    return isOpenAtWeekMinute(hours, weekMinuteOf(now));
  }
  const local = new Date(now.getTime() + utcOffsetMinutes * 60_000);
  const weekMinute =
    (local.getUTCDay() * 24 + local.getUTCHours()) * 60 + local.getUTCMinutes();
  return isOpenAtWeekMinute(hours, weekMinute);
}
