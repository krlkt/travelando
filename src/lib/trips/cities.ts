import type {
  Trip,
  TripItem,
  CityOverride,
  CitySegment,
  DayCityBucket,
} from './types';
import { dayKey } from '@/lib/time/formatDate';

function arrivalTimestamp(transport: TripItem): number {
  return transport.endsAt
    ? new Date(transport.endsAt).getTime()
    : new Date(transport.startsAt).getTime() + 1;
}

function itemOverlapsDay(
  item: TripItem,
  dayStart: number,
  dayEnd: number,
): boolean {
  const startTs = new Date(item.startsAt).getTime();
  const endTs = item.endsAt ? new Date(item.endsAt).getTime() : startTs;
  return startTs <= dayEnd && endTs >= dayStart;
}

function buildDaySegments(
  dayItems: TripItem[],
  cityChangeTransports: TripItem[],
  dayStart: number,
  dayEnd: number,
  initialCity: string,
  initialPlaceId: string | undefined,
): {
  segments: CitySegment[];
  finalCity: string;
  finalPlaceId: string | undefined;
} {
  const segments: CitySegment[] = [];
  let segCity = initialCity;
  let segPlaceId = initialPlaceId;
  let prevCutoff = dayStart;

  const effectiveTs = (item: TripItem): number => {
    const startTs = new Date(item.startsAt).getTime();
    return Math.max(startTs, dayStart);
  };

  const sortedCityChanges = [...cityChangeTransports].sort(
    (a, b) => arrivalTimestamp(a) - arrivalTimestamp(b),
  );

  for (const transport of sortedCityChanges) {
    const arrivalTs = arrivalTimestamp(transport);

    const segItems = dayItems.filter((item) => {
      const ts = effectiveTs(item);
      return ts >= prevCutoff && ts < arrivalTs;
    });

    segments.push({
      cityLabel: segCity,
      cityPlaceId: segPlaceId,
      items: segItems,
    });

    segCity = transport.toCity!.label;
    segPlaceId = transport.toCity!.placeId;
    prevCutoff = arrivalTs;
  }

  const finalItems = dayItems.filter((item) => {
    const ts = effectiveTs(item);
    return ts >= prevCutoff && ts <= dayEnd;
  });

  segments.push({
    cityLabel: segCity,
    cityPlaceId: segPlaceId,
    items: finalItems,
  });

  return { segments, finalCity: segCity, finalPlaceId: segPlaceId };
}

export function deriveCitiesByDay(
  trip: Trip,
  overrides: CityOverride[] = [],
): Map<string, DayCityBucket> {
  const overrideMap = new Map<string, CityOverride>();
  for (const o of overrides) overrideMap.set(o.dayKey, o);

  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const sortedItems = [...trip.items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  const result = new Map<string, DayCityBucket>();
  let currentCity = trip.destination;
  let currentPlaceId: string | undefined;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d.toISOString());
    const date = new Date(d);
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const override = overrideMap.get(key);
    if (override) {
      currentCity = override.cityLabel;
      currentPlaceId = override.cityPlaceId;
    }

    const dayItems = sortedItems.filter(
      (i) => i.kind !== 'lodging' && itemOverlapsDay(i, dayStart, dayEnd),
    );

    const cityChangeTransports = dayItems.filter((i) => {
      if (i.kind !== 'transport' || !i.toCity?.label) return false;
      const arrivalTs = arrivalTimestamp(i);
      return arrivalTs >= dayStart && arrivalTs <= dayEnd;
    });

    if (cityChangeTransports.length === 0) {
      result.set(key, {
        key,
        date,
        segments: [
          {
            cityLabel: currentCity,
            cityPlaceId: currentPlaceId,
            items: dayItems,
          },
        ],
      });
    } else {
      const { segments, finalCity, finalPlaceId } = buildDaySegments(
        dayItems,
        cityChangeTransports,
        dayStart,
        dayEnd,
        currentCity,
        currentPlaceId,
      );
      currentCity = finalCity;
      currentPlaceId = finalPlaceId;
      result.set(key, { key, date, segments });
    }
  }

  return result;
}

export function latestCityBefore(
  trip: Trip,
  overrides: CityOverride[],
  isoTimestamp: string,
): { cityLabel: string; cityPlaceId?: string } {
  const ts = new Date(isoTimestamp).getTime();
  const buckets = deriveCitiesByDay(trip, overrides);

  let result: { cityLabel: string; cityPlaceId?: string } = {
    cityLabel: trip.destination,
  };

  for (const bucket of [...buckets.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )) {
    for (const seg of bucket.segments) {
      const segStart = seg.startsAt
        ? new Date(seg.startsAt).getTime()
        : bucket.date.getTime();
      if (segStart <= ts) {
        result = { cityLabel: seg.cityLabel, cityPlaceId: seg.cityPlaceId };
      }
    }
  }

  return result;
}

export function cityForDay(
  trip: Trip,
  overrides: CityOverride[],
  key: string,
): { cityLabel: string; cityPlaceId?: string } {
  const buckets = deriveCitiesByDay(trip, overrides);
  const bucket = buckets.get(key);
  if (!bucket || bucket.segments.length === 0)
    return { cityLabel: trip.destination };
  const last = bucket.segments[bucket.segments.length - 1];
  return { cityLabel: last.cityLabel, cityPlaceId: last.cityPlaceId };
}

export function lodgingForDay(trip: Trip, key: string): TripItem | null {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const dayEnd = date.getTime() + 24 * 60 * 60 * 1000 - 1;

  const candidates = trip.items.filter((i) => {
    if (i.kind !== 'lodging') return false;
    const startTs = new Date(i.startsAt).getTime();
    if (startTs > dayEnd) return false;
    if (!i.endsAt) return false;
    const endTs = new Date(i.endsAt).getTime();
    return endTs > dayEnd;
  });

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, item) =>
    new Date(item.startsAt).getTime() > new Date(latest.startsAt).getTime()
      ? item
      : latest,
  );
}

/**
 * The lodging you *woke up in* on `key` — checked in before the day began and
 * still checked in at its start (typically a check-out later this morning).
 * Distinct from {@link lodgingForDay}, which is where you sleep *that* night;
 * the two coincide on the middle nights of a multi-night stay. Used to anchor
 * the morning "hotel → first stop" leg.
 */
export function lodgingWakeUpForDay(trip: Trip, key: string): TripItem | null {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const dayStart = date.getTime();

  const candidates = trip.items.filter((i) => {
    if (i.kind !== 'lodging') return false;
    if (!i.endsAt) return false;
    const startTs = new Date(i.startsAt).getTime();
    if (startTs >= dayStart) return false;
    const endTs = new Date(i.endsAt).getTime();
    return endTs > dayStart;
  });

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, item) =>
    new Date(item.startsAt).getTime() > new Date(latest.startsAt).getTime()
      ? item
      : latest,
  );
}

export function findLodgingConflict(
  trip: Trip,
  checkInIso: string,
  checkOutIso: string,
  excludeId?: string,
): TripItem | null {
  const aStart = new Date(checkInIso).getTime();
  const aEnd = new Date(checkOutIso).getTime();
  if (!Number.isFinite(aStart) || !Number.isFinite(aEnd) || aEnd <= aStart) {
    return null;
  }

  for (const item of trip.items) {
    if (item.kind !== 'lodging') continue;
    if (item.id === excludeId) continue;
    if (!item.endsAt) continue;
    const bStart = new Date(item.startsAt).getTime();
    const bEnd = new Date(item.endsAt).getTime();
    // Half-open intervals: overlap iff aStart < bEnd && bStart < aEnd
    if (aStart < bEnd && bStart < aEnd) return item;
  }
  return null;
}

export function foodPlaceCitiesForDay(
  trip: Trip,
  overrides: CityOverride[],
  key: string,
): Array<{ cityLabel: string; cityPlaceId?: string }> {
  const buckets = deriveCitiesByDay(trip, overrides);
  const bucket = buckets.get(key);
  if (!bucket) return [{ cityLabel: trip.destination }];

  const seen = new Set<string>();
  const cities: Array<{ cityLabel: string; cityPlaceId?: string }> = [];
  for (const seg of bucket.segments) {
    const dedupeKey = seg.cityPlaceId ?? seg.cityLabel;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      cities.push({ cityLabel: seg.cityLabel, cityPlaceId: seg.cityPlaceId });
    }
  }
  return cities;
}
