import type { Trip, TripItem } from './types';
import { dayKey } from '@/lib/time/formatDate';

export interface DayBucket {
  key: string;
  date: Date;
  items: TripItem[];
}

export function groupItemsByDay(trip: Trip): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d.toISOString());
    buckets.set(key, { key, date: new Date(d), items: [] });
  }

  for (const item of trip.items) {
    const key = dayKey(item.startsAt);
    if (!buckets.has(key)) {
      buckets.set(key, { key, date: new Date(item.startsAt), items: [] });
    }
    buckets.get(key)!.items.push(item);
  }

  for (const bucket of buckets.values()) {
    bucket.items.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }

  return [...buckets.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export function totalsByCurrency(items: TripItem[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const i of items) {
    if (!i.expense) continue;
    out.set(
      i.expense.currency,
      (out.get(i.expense.currency) ?? 0) + i.expense.amount,
    );
  }
  return out;
}

export function totalsByCategory(
  items: TripItem[],
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const i of items) {
    if (!i.expense) continue;
    const cat = i.kind;
    if (!out.has(cat)) out.set(cat, new Map());
    const cur = out.get(cat)!;
    cur.set(
      i.expense.currency,
      (cur.get(i.expense.currency) ?? 0) + i.expense.amount,
    );
  }
  return out;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatAmountInput(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseAmountInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^\d.,-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === ',') {
    return null;
  }

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  let normalized: string;
  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    const parts = cleaned.split(',');
    const isDecimalUse =
      parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2;
    normalized = isDecimalUse
      ? `${parts[0]}.${parts[1]}`
      : cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function findCurrentItem(items: TripItem[], now: Date): TripItem | null {
  return (
    items.find((i) => {
      const start = new Date(i.startsAt);
      const end = i.endsAt
        ? new Date(i.endsAt)
        : new Date(start.getTime() + 60 * 60 * 1000);
      return start <= now && now <= end;
    }) ?? null
  );
}

export function findNextItem(items: TripItem[], now: Date): TripItem | null {
  return (
    items
      .filter((i) => new Date(i.startsAt) > now)
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )[0] ?? null
  );
}
