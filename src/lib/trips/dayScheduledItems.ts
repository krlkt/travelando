import type { CityOverride, Trip, TripItem } from './types';
import { deriveCitiesByDay } from './cities';
import { parseNaive } from '@/lib/time/naive';

/**
 * The day's scheduled items in start-time order — the same set that forms the
 * route on the day map. Lodging is excluded upstream by `deriveCitiesByDay`, so
 * this is the activity/meal/transport/note timeline for the day.
 *
 * Pure and side-effect free so it can be unit-tested without a renderer, and
 * shared by both `buildDayMapPoints` and the compact "add to this day" sheet.
 */
export function dayScheduledItems(
  trip: Trip,
  dayKey: string,
  overrides: CityOverride[] = [],
): TripItem[] {
  const bucket = deriveCitiesByDay(trip, overrides).get(dayKey);
  if (!bucket) return [];
  return bucket.segments
    .flatMap((seg) => seg.items)
    .slice()
    .sort(
      (a, b) =>
        parseNaive(a.startsAt).getTime() - parseNaive(b.startsAt).getTime(),
    );
}
