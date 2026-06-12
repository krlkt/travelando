// Formatters for floating wall-time values (see `naive.ts`). Strings are
// parsed by components — never via bare `new Date(string)` — so an itinerary
// time reads the same on every device regardless of its timezone.

import { parseNaive, stripOffset } from './naive';

type DateInput = string | Date;

const asDate = (value: DateInput): Date =>
  value instanceof Date ? value : parseNaive(value);

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dateFmtLong = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});
const monthDayFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});
const shortDateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
});

export const formatDate = (value: DateInput): string =>
  dateFmt.format(asDate(value));
export const formatDateLong = (value: DateInput): string =>
  dateFmtLong.format(asDate(value));
export const formatTime = (value: DateInput): string =>
  timeFmt.format(asDate(value));
export const formatMonthDay = (value: DateInput): string =>
  monthDayFmt.format(asDate(value));

/** Returns "DD.MM" e.g. "12.05" — compact date for narrow contexts. */
export const formatShortDate = (value: DateInput): string =>
  shortDateFmt.format(asDate(value)).replace('/', '.');

export function formatDateRange(start: DateInput, end: DateInput): string {
  const startDate = asDate(start);
  const endDate = asDate(end);
  const sameMonth =
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear();
  if (sameMonth) {
    return `${startDate.getDate()}–${endDate.getDate()} ${dateFmt
      .format(endDate)
      .split(' ')
      .slice(1)
      .join(' ')}`;
  }
  return `${formatMonthDay(start)} → ${formatMonthDay(end)}`;
}

export function dayKey(value: DateInput): string {
  if (typeof value === 'string') return stripOffset(value).slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(
    value.getDate(),
  ).padStart(2, '0')}`;
}

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function isSameDay(a: DateInput, b: DateInput): boolean {
  const da = asDate(a);
  const db = asDate(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function dayOffsetFrom(reference: DateInput, target: DateInput): number {
  const diffMs =
    startOfLocalDay(asDate(target)) - startOfLocalDay(asDate(reference));
  return Math.round(diffMs / 86_400_000);
}

export function tripDayCount(start: DateInput, end: DateInput): number {
  const diffMs = startOfLocalDay(asDate(end)) - startOfLocalDay(asDate(start));
  return Math.max(1, Math.round(diffMs / 86_400_000) + 1);
}

export function isOngoing(
  start: DateInput,
  end: DateInput,
  now = new Date(),
): boolean {
  // The end date is inclusive: a trip is still ongoing through its last day.
  const endOfLastDay = startOfLocalDay(asDate(end)) + 86_400_000;
  return asDate(start) <= now && now.getTime() < endOfLastDay;
}

export function isUpcoming(start: DateInput, now = new Date()): boolean {
  return asDate(start) > now;
}

export function relativeFromNow(value: DateInput, now = new Date()): string {
  const diff = asDate(value).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const sign = diff < 0 ? 'ago' : '';
  const lead = diff < 0 ? '' : 'in ';
  if (minutes < 1) return diff < 0 ? 'just now' : 'in a moment';
  if (minutes < 60) return `${lead}${minutes}m${sign ? ' ' + sign : ''}`;
  if (hours < 24) return `${lead}${hours}h${sign ? ' ' + sign : ''}`;
  return `${lead}${days}d${sign ? ' ' + sign : ''}`;
}
