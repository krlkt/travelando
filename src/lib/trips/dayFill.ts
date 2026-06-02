import type { TripItem } from './types';

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 22;
const CORE_WINDOW_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60; // 780

export type DayFillLevel = 'empty' | 'light' | 'moderate' | 'full';

function windowBounds(date: Date): { windowStart: number; windowEnd: number } {
  const windowStart = new Date(date);
  windowStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const windowEnd = new Date(date);
  windowEnd.setHours(DAY_END_HOUR, 0, 0, 0);
  return { windowStart: windowStart.getTime(), windowEnd: windowEnd.getTime() };
}

export function computeDayFillRatio(items: TripItem[], date: Date): number {
  const { windowStart, windowEnd } = windowBounds(date);

  const intervals: Array<{ start: number; end: number }> = [];

  for (const item of items) {
    if (item.kind === 'note') continue;

    const itemStart = new Date(item.startsAt).getTime();
    const itemEnd = item.endsAt
      ? new Date(item.endsAt).getTime()
      : itemStart + 60 * 60_000;

    const clippedStart = Math.max(itemStart, windowStart);
    const clippedEnd = Math.min(itemEnd, windowEnd);

    if (clippedStart < clippedEnd) {
      intervals.push({ start: clippedStart, end: clippedEnd });
    }
  }

  if (intervals.length === 0) return 0;

  intervals.sort((a, b) => a.start - b.start);

  let coveredMs = 0;
  let unionStart = intervals[0].start;
  let unionEnd = intervals[0].end;

  for (let i = 1; i < intervals.length; i++) {
    const { start, end } = intervals[i];
    if (start <= unionEnd) {
      unionEnd = Math.max(unionEnd, end);
    } else {
      coveredMs += unionEnd - unionStart;
      unionStart = start;
      unionEnd = end;
    }
  }
  coveredMs += unionEnd - unionStart;

  const coveredMinutes = coveredMs / 60_000;
  return Math.min(coveredMinutes / CORE_WINDOW_MINUTES, 1);
}

export function getDayFillLevel(ratio: number): DayFillLevel {
  if (ratio === 0) return 'empty';
  if (ratio < 0.35) return 'light';
  if (ratio < 0.67) return 'moderate';
  return 'full';
}
