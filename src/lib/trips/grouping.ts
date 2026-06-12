import type { Trip, TripItem } from './types';
import { dayKey } from '@/lib/time/formatDate';
import { parseNaive } from '@/lib/time/naive';

export interface DayBucket {
  key: string;
  date: Date;
  items: TripItem[];
}

export function groupItemsByDay(trip: Trip): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  const start = parseNaive(trip.startDate);
  const end = parseNaive(trip.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    buckets.set(key, { key, date: new Date(d), items: [] });
  }

  for (const item of trip.items) {
    const key = dayKey(item.startsAt);
    if (!buckets.has(key)) {
      buckets.set(key, { key, date: parseNaive(item.startsAt), items: [] });
    }
    buckets.get(key)!.items.push(item);
  }

  for (const bucket of buckets.values()) {
    bucket.items.sort(
      (a, b) =>
        parseNaive(a.startsAt).getTime() - parseNaive(b.startsAt).getTime(),
    );
  }

  return [...buckets.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export function formatMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${formatAmountInput(amount)} ${code}`;
  }
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

const BACKGROUND_MIN_HOURS = 4;

export function isBackgroundItem(item: TripItem): boolean {
  if (item.kind !== 'transport') return false;
  if (!item.endsAt) return false;
  const durationHours =
    (parseNaive(item.endsAt).getTime() - parseNaive(item.startsAt).getTime()) /
    3_600_000;
  return durationHours >= BACKGROUND_MIN_HOURS;
}

export function findOverlappingItemIds(items: TripItem[]): Set<string> {
  const overlapping = new Set<string>();
  const ranges = items.map((item) => {
    const start = parseNaive(item.startsAt).getTime();
    const end = item.endsAt
      ? parseNaive(item.endsAt).getTime()
      : start + 60 * 60 * 1000;
    return { id: item.id, start, end };
  });
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i];
      const b = ranges[j];
      if (a.start < b.end && b.start < a.end) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}

export function findCurrentItem(items: TripItem[], now: Date): TripItem | null {
  return (
    items.find((i) => {
      const start = parseNaive(i.startsAt);
      const end = i.endsAt
        ? parseNaive(i.endsAt)
        : new Date(start.getTime() + 60 * 60 * 1000);
      return start <= now && now <= end;
    }) ?? null
  );
}

export function findNextItem(items: TripItem[], now: Date): TripItem | null {
  return (
    items
      .filter((i) => parseNaive(i.startsAt) > now)
      .sort(
        (a, b) =>
          parseNaive(a.startsAt).getTime() - parseNaive(b.startsAt).getTime(),
      )[0] ?? null
  );
}
