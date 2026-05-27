import type {
  Trip,
  TripItem,
  CityOverride,
  CitySegment,
  DayCityBucket,
} from './types';
import { dayKey } from '@/lib/time/formatDate';

function buildDaySegments(
  dayItems: TripItem[],
  dayTransports: TripItem[],
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

  for (const transport of dayTransports) {
    // +1ms so transport item itself (ts = departure) is included in the departure segment
    const arrivalTs = transport.endsAt
      ? new Date(transport.endsAt).getTime()
      : new Date(transport.startsAt).getTime() + 1;

    const segItems = dayItems.filter((item) => {
      const ts = new Date(item.startsAt).getTime();
      return ts >= prevCutoff && ts < arrivalTs;
    });

    segments.push({
      cityLabel: segCity,
      cityPlaceId: segPlaceId,
      items: segItems,
    });

    segCity = transport.to!.label;
    segPlaceId = transport.to!.placeId;
    prevCutoff = arrivalTs;
  }

  const finalItems = dayItems.filter((item) => {
    const ts = new Date(item.startsAt).getTime();
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

    const dayItems = sortedItems.filter((i) => {
      const ts = new Date(i.startsAt).getTime();
      return ts >= dayStart && ts <= dayEnd;
    });

    const dayTransports = dayItems.filter(
      (i) => i.kind === 'transport' && i.to?.label,
    );

    if (dayTransports.length === 0) {
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
        dayTransports,
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
  const first = bucket.segments[0];
  return { cityLabel: first.cityLabel, cityPlaceId: first.cityPlaceId };
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
