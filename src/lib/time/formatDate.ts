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

export const formatDate = (iso: string): string =>
  dateFmt.format(new Date(iso));
export const formatDateLong = (iso: string): string =>
  dateFmtLong.format(new Date(iso));
export const formatTime = (iso: string): string =>
  timeFmt.format(new Date(iso));
export const formatMonthDay = (iso: string): string =>
  monthDayFmt.format(new Date(iso));

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${dateFmt
      .format(end)
      .split(' ')
      .slice(1)
      .join(' ')}`;
  }
  return `${formatMonthDay(startIso)} → ${formatMonthDay(endIso)}`;
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function startOfLocalDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function dayOffsetFrom(
  reference: string | Date,
  target: string | Date,
): number {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const tgt = target instanceof Date ? target : new Date(target);
  const diffMs = startOfLocalDay(tgt) - startOfLocalDay(ref);
  return Math.round(diffMs / 86_400_000);
}

export function tripDayCount(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
}

export function isOngoing(
  startIso: string,
  endIso: string,
  now = new Date(),
): boolean {
  return new Date(startIso) <= now && now <= new Date(endIso);
}

export function isUpcoming(startIso: string, now = new Date()): boolean {
  return new Date(startIso) > now;
}

export function relativeFromNow(iso: string, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
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
