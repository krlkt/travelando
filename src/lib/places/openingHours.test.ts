import { describe, expect, it } from 'vitest';
import {
  isOpenAtWeekMinute,
  openStateAtWallTime,
  openStateNow,
  weekMinuteOf,
  type RegularOpeningHours,
} from './openingHours';

// Helper: week-minute for a given JS weekday (0=Sun) + time.
const wm = (day: number, hour: number, minute = 0): number =>
  (day * 24 + hour) * 60 + minute;

// Mon–Fri 09:00–17:00.
const weekday9to5: RegularOpeningHours = {
  periods: [1, 2, 3, 4, 5].map((day) => ({
    open: { day, hour: 9, minute: 0 },
    close: { day, hour: 17, minute: 0 },
  })),
};

describe('isOpenAtWeekMinute', () => {
  it('returns unknown when there are no periods', () => {
    expect(isOpenAtWeekMinute(undefined, wm(1, 12))).toBe('unknown');
    expect(isOpenAtWeekMinute({ periods: [] }, wm(1, 12))).toBe('unknown');
  });

  it('is open inside the interval and closed outside', () => {
    expect(isOpenAtWeekMinute(weekday9to5, wm(1, 12))).toBe('open');
    expect(isOpenAtWeekMinute(weekday9to5, wm(1, 8, 59))).toBe('closed');
    expect(isOpenAtWeekMinute(weekday9to5, wm(6, 12))).toBe('closed'); // Saturday
  });

  it('treats the open boundary as open and the close boundary as closed', () => {
    expect(isOpenAtWeekMinute(weekday9to5, wm(1, 9, 0))).toBe('open');
    expect(isOpenAtWeekMinute(weekday9to5, wm(1, 17, 0))).toBe('closed');
  });

  it('handles a period with no close as always open', () => {
    const allDay: RegularOpeningHours = {
      periods: [{ open: { day: 0, hour: 0, minute: 0 } }],
    };
    expect(isOpenAtWeekMinute(allDay, wm(3, 3))).toBe('open');
  });

  it('handles overnight periods that wrap past midnight', () => {
    // A bar open Fri 18:00 → Sat 02:00.
    const overnight: RegularOpeningHours = {
      periods: [
        {
          open: { day: 5, hour: 18, minute: 0 },
          close: { day: 6, hour: 2, minute: 0 },
        },
      ],
    };
    expect(isOpenAtWeekMinute(overnight, wm(5, 23))).toBe('open');
    expect(isOpenAtWeekMinute(overnight, wm(6, 1))).toBe('open');
    expect(isOpenAtWeekMinute(overnight, wm(6, 3))).toBe('closed');
  });

  it('handles a period wrapping the week boundary (Sat night into Sun)', () => {
    const satNight: RegularOpeningHours = {
      periods: [
        {
          open: { day: 6, hour: 22, minute: 0 },
          close: { day: 0, hour: 1, minute: 0 },
        },
      ],
    };
    expect(isOpenAtWeekMinute(satNight, wm(6, 23))).toBe('open');
    expect(isOpenAtWeekMinute(satNight, wm(0, 0, 30))).toBe('open');
    expect(isOpenAtWeekMinute(satNight, wm(0, 2))).toBe('closed');
  });
});

describe('weekMinuteOf', () => {
  it('reads a Date by its wall-clock fields', () => {
    // 2026-06-15 is a Monday.
    const monNoon = new Date(2026, 5, 15, 12, 0);
    expect(weekMinuteOf(monNoon)).toBe(wm(1, 12));
  });
});

describe('openStateAtWallTime', () => {
  it('checks a planned slot against the place hours', () => {
    const monday2pm = new Date(2026, 5, 15, 14, 0);
    const monday7am = new Date(2026, 5, 15, 7, 0);
    expect(openStateAtWallTime(weekday9to5, monday2pm)).toBe('open');
    expect(openStateAtWallTime(weekday9to5, monday7am)).toBe('closed');
  });
});

describe('openStateNow', () => {
  it('uses the place offset to read its local time', () => {
    // UTC instant: Monday 2026-06-15 23:00 UTC. In Tokyo (+540) that is
    // Tuesday 08:00 — closed before 09:00.
    const utcInstant = new Date(Date.UTC(2026, 5, 15, 23, 0));
    expect(openStateNow(weekday9to5, 540, utcInstant)).toBe('closed');

    // One hour later (Tue 09:00 local) it is open.
    const oneHourLater = new Date(Date.UTC(2026, 5, 16, 0, 0));
    expect(openStateNow(weekday9to5, 540, oneHourLater)).toBe('open');
  });

  it('falls back to the device clock when offset is unknown', () => {
    const monNoon = new Date(2026, 5, 15, 12, 0);
    expect(openStateNow(weekday9to5, undefined, monNoon)).toBe('open');
  });
});
