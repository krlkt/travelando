import { deriveCitiesByDay } from './cities';
import type { CityOverride, Expense, Trip } from './types';

/**
 * Bucket key for expenses whose spent day falls outside the trip's detectable
 * city timeline (typically a `spentOn` date outside the trip's date range).
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

/**
 * Map each trip day to the city it resolved to. A day with multiple city
 * segments uses its last segment — the city you ended the day in — because
 * expenses carry only a date, never a time, so intra-day moves can't be split.
 */
function dayCityMap(
  trip: Trip,
  overrides: CityOverride[],
): Map<string, ResolvedCity> {
  const buckets = deriveCitiesByDay(trip, overrides);
  const map = new Map<string, ResolvedCity>();
  for (const [key, bucket] of buckets) {
    const last = bucket.segments[bucket.segments.length - 1];
    if (!last) continue;
    map.set(key, {
      key: last.cityPlaceId ?? last.cityLabel,
      label: last.cityLabel,
    });
  }
  return map;
}

function cityForExpense(
  expense: Expense,
  dayMap: Map<string, ResolvedCity>,
  trip: Trip,
): ResolvedCity {
  // `spentOn` is already a `YYYY-MM-DD` day key matching deriveCitiesByDay's.
  return (
    dayMap.get(expense.spentOn) ?? {
      key: trip.destination,
      label: trip.destination,
    }
  );
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
  const dayMap = dayCityMap(trip, overrides);
  const keyByExpenseId = new Map<string, string>();
  const groups = new Map<string, ExpenseCityGroup>();

  for (const expense of expenses) {
    const city = cityForExpense(expense, dayMap, trip);
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
