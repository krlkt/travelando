import { deriveCitiesByDay } from './cities';
import type { CityOverride, Expense, Trip, TripItem } from './types';

/**
 * Bucket key for expenses with no detectable city: a `spentOn` date outside the
 * trip's date range, or a day that only ever resolved to the bare trip
 * destination (the baseline `deriveCitiesByDay` assigns when no transport or
 * override pins a real city). Both mean "we can't actually tell which city".
 */
export const UNDETECTED_CITY_KEY = '__undetected__';
const UNDETECTED_CITY_LABEL = 'Undetectable';

export interface ExpenseCityGroup {
  /** Stable identity: the city's place id when known, else its label. */
  key: string;
  label: string;
  count: number;
}

export interface ExpenseCityResolution {
  /** Cities present among the expenses, ordered by descending count. */
  groups: ExpenseCityGroup[];
  /** Expense id → city key, for filtering the list. */
  keyByExpenseId: Map<string, string>;
}

interface ResolvedCity {
  key: string;
  label: string;
}

const UNDETECTED_CITY: ResolvedCity = {
  key: UNDETECTED_CITY_KEY,
  label: UNDETECTED_CITY_LABEL,
};

interface CityMaps {
  /** Day key (`YYYY-MM-DD`) → resolved city. */
  byDay: Map<string, ResolvedCity>;
  /** Timeline item id → resolved city of the segment it sits in. */
  byItem: Map<string, ResolvedCity>;
}

/**
 * Resolve a derived city segment to a chip identity. A bare destination segment
 * (no place id, label === destination) is the baseline `deriveCitiesByDay`
 * assigns when nothing pins a real city — never a detected city — so it folds
 * into the Undetectable bucket rather than getting a destination-named chip.
 */
function segmentCity(
  cityLabel: string,
  cityPlaceId: string | undefined,
  trip: Trip,
): ResolvedCity {
  if (!cityPlaceId && cityLabel === trip.destination) return UNDETECTED_CITY;
  return { key: cityPlaceId ?? cityLabel, label: cityLabel };
}

/**
 * A transport that moves between two distinct cities. Its expenses happened in
 * transit, so they can't be pinned to either endpoint — they fold into the
 * Undetectable bucket rather than inheriting the departure segment's city. A
 * transport with a `toCity` but no `fromCity` counts as a city change too,
 * mirroring how `deriveCitiesByDay` detects them.
 */
function isCityChangeTransport(item: TripItem): boolean {
  return (
    item.kind === 'transport' &&
    !!item.toCity?.label &&
    item.toCity.label !== item.fromCity?.label
  );
}

/**
 * Index the trip's derived city timeline two ways in a single pass: by day (the
 * city you *ended* each day in, since expenses carry only a date) and by the
 * timeline item each city segment contains. Overrides flow through
 * `deriveCitiesByDay`, so a per-day city override is respected by both maps.
 * City-change transports fold into Undetectable — their expenses were incurred
 * in transit between cities, not in the departure segment they sit in.
 */
function buildCityMaps(trip: Trip, overrides: CityOverride[]): CityMaps {
  const buckets = deriveCitiesByDay(trip, overrides);
  const byDay = new Map<string, ResolvedCity>();
  const byItem = new Map<string, ResolvedCity>();
  for (const [key, bucket] of buckets) {
    for (const seg of bucket.segments) {
      const city = segmentCity(seg.cityLabel, seg.cityPlaceId, trip);
      for (const item of seg.items)
        byItem.set(
          item.id,
          isCityChangeTransport(item) ? UNDETECTED_CITY : city,
        );
    }
    const last = bucket.segments[bucket.segments.length - 1];
    if (last)
      byDay.set(key, segmentCity(last.cityLabel, last.cityPlaceId, trip));
  }
  return { byDay, byItem };
}

/**
 * An expense linked to a timeline item takes that item's city; otherwise it
 * falls back to the city of the day it was paid, and finally to Undetectable
 * when that day is outside the trip's timeline.
 */
function cityForExpense(expense: Expense, maps: CityMaps): ResolvedCity {
  if (expense.itemId) {
    const itemCity = maps.byItem.get(expense.itemId);
    if (itemCity) return itemCity;
  }
  // `spentOn` is already a `YYYY-MM-DD` day key matching deriveCitiesByDay's.
  return maps.byDay.get(expense.spentOn) ?? UNDETECTED_CITY;
}

/**
 * Resolve every expense to a city (by its spent day) and summarize the distinct
 * cities present. Returns both the chip groups and a per-expense lookup so the
 * page derives the city index in a single pass.
 */
export function resolveExpenseCities(
  expenses: Expense[],
  trip: Trip,
  overrides: CityOverride[] = [],
): ExpenseCityResolution {
  const maps = buildCityMaps(trip, overrides);
  const keyByExpenseId = new Map<string, string>();
  const groups = new Map<string, ExpenseCityGroup>();

  for (const expense of expenses) {
    const city = cityForExpense(expense, maps);
    keyByExpenseId.set(expense.id, city.key);
    const existing = groups.get(city.key);
    if (existing) existing.count += 1;
    else groups.set(city.key, { key: city.key, label: city.label, count: 1 });
  }

  const ordered = [...groups.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );

  return { groups: ordered, keyByExpenseId };
}
