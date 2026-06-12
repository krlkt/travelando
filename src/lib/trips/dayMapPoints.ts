import type {
  ActivityPlace,
  ActivityPlaceCategory,
  CityOverride,
  FoodPlace,
  FoodPlaceCategory,
  ItemKind,
  Place,
  Trip,
  TripItem,
} from './types';
import {
  deriveCitiesByDay,
  foodPlaceCitiesForDay,
  lodgingForDay,
} from './cities';
import { transportEndpoints } from './transportRoute';
import { dayKey as toDayKey } from '@/lib/time/formatDate';
import { parseNaive } from '@/lib/time/naive';
import {
  haversineMeters,
  nearestDistanceMeters,
  type LngLat,
} from '@/lib/map/distance';

/**
 * A single point plotted on the day map. The discriminated `kind` drives both
 * marker styling and interaction:
 *  - `lodging`        — where you're sleeping (anchor)
 *  - `scheduled`      — something already on the day's timeline (the route)
 *  - `foodWish` /
 *    `activityWish`   — unscheduled wishlist candidates for the day's cities
 */
interface BaseDayMapPoint {
  /** Stable key for rendering/diffing markers. */
  id: string;
  lat: number;
  lng: number;
  label: string;
  address?: string;
  placeId?: string;
}

export interface LodgingMapPoint extends BaseDayMapPoint {
  kind: 'lodging';
  itemId: string;
  /** When set, this lodging is part of the day's route at this position. */
  order?: number;
}

export interface ScheduledMapPoint extends BaseDayMapPoint {
  kind: 'scheduled';
  itemId: string;
  itemKind: ItemKind;
  /** 1-based position in the day's time-ordered route. */
  order: number;
  startsAt: string;
  /**
   * Transport legs are pinned at both ends. `depart` is the origin waypoint,
   * `arrive` the destination; absent for single-location items.
   */
  endpoint?: 'depart' | 'arrive';
}

export interface FoodWishMapPoint extends BaseDayMapPoint {
  kind: 'foodWish';
  placeRefId: string;
  wantLevel?: number;
  category?: FoodPlaceCategory;
  /** Straight-line metres to the nearest scheduled/lodging anchor (proximity hint). */
  nearestPlanMeters?: number;
}

export interface ActivityWishMapPoint extends BaseDayMapPoint {
  kind: 'activityWish';
  placeRefId: string;
  wantLevel?: number;
  category?: ActivityPlaceCategory;
  /** Straight-line metres to the nearest scheduled/lodging anchor (proximity hint). */
  nearestPlanMeters?: number;
}

export type DayMapPoint =
  | LodgingMapPoint
  | ScheduledMapPoint
  | FoodWishMapPoint
  | ActivityWishMapPoint;

export interface DayMapData {
  points: DayMapPoint[];
  /** Items/wishes relevant to the day that lack coordinates (can't be pinned). */
  unlocatedCount: number;
  /** Cities covered by the day, in segment order. */
  cities: Array<{ cityLabel: string; cityPlaceId?: string }>;
}

function isLocated<T extends Pick<Place, 'lat' | 'lng'>>(
  place: T | undefined,
): place is T & { lat: number; lng: number } {
  return (
    !!place &&
    typeof place.lat === 'number' &&
    typeof place.lng === 'number' &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
  );
}

/** The location a timeline item should be pinned at: destination first, else origin. */
function itemPlace(item: TripItem): Place | undefined {
  if (isLocated(item.to)) return item.to;
  if (isLocated(item.from)) return item.from;
  return undefined;
}

function cityKey(city: { cityLabel: string; cityPlaceId?: string }): string {
  return city.cityPlaceId ?? city.cityLabel;
}

/** Two route stops within this distance are treated as the same location. */
const SAME_LOCATION_M = 50;

/**
 * Returns true when `a` and `b` represent the same geographic stop. Checks
 * `placeId` equality first (most reliable), then falls back to haversine
 * distance so that city-vs-station pairs that are effectively the same place
 * (e.g. a hotel and the transport departure pinned at it) collapse into one pin.
 */
function isSameRouteLocation(
  a: { lat: number; lng: number; placeId?: string },
  b: { lat: number; lng: number; placeId?: string } | null,
): boolean {
  if (!b) return false;
  if (a.placeId && b.placeId && a.placeId === b.placeId) return true;
  return haversineMeters(a, b) < SAME_LOCATION_M;
}

/**
 * Collects every map-able point for a single day: lodging, the day's scheduled
 * items (in time order), and the food/activity wishlists for the day's cities.
 * Pure and side-effect free so it can be unit-tested without a map renderer.
 *
 * Wishlist points already represented by a scheduled item (same `placeId`) are
 * dropped to avoid duplicate pins once a wish has been added to the day.
 */
export function buildDayMapPoints(
  trip: Trip,
  dayKey: string,
  foodPlaces: FoodPlace[],
  activityPlaces: ActivityPlace[],
  overrides: CityOverride[] = [],
): DayMapData {
  const buckets = deriveCitiesByDay(trip, overrides);
  const bucket = buckets.get(dayKey);
  const cities = foodPlaceCitiesForDay(trip, overrides, dayKey);
  const cityKeys = new Set(cities.map(cityKey));

  const points: DayMapPoint[] = [];
  let unlocatedCount = 0;

  // --- Scheduled items (the route), time-ordered ----------------------------
  const dayItems = bucket
    ? bucket.segments
        .flatMap((seg) => seg.items)
        .slice()
        .sort(
          (a, b) =>
            parseNaive(a.startsAt).getTime() - parseNaive(b.startsAt).getTime(),
        )
    : [];

  const scheduledPlaceIds = new Set<string>();
  let order = 0;

  // --- Pre-compute prev lodging to seed the dedup tracker ------------------
  // Must happen before the scheduled-items loop so the first transport leg can
  // check its depart against the lodging location.
  const prevDate = new Date(`${dayKey}T00:00:00`);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevLodging = lodgingForDay(trip, toDayKey(prevDate));
  const prevLodgingPlace = prevLodging ? itemPlace(prevLodging) : undefined;

  // Tracks the last geographic location added to the route. Seeded from the
  // previous day's lodging so that a transport departing from there does not
  // produce a redundant numbered pin on top of the lodging icon. Updated after
  // every successfully pushed scheduled point.
  let lastLocation: { lat: number; lng: number; placeId?: string } | null =
    isLocated(prevLodgingPlace) ? prevLodgingPlace : null;

  // Pushes one scheduled stop, advancing the route order. `idSuffix`/`endpoint`
  // let a single transport item contribute two pins (depart + arrive).
  const pushScheduled = (
    item: TripItem,
    place: { lat: number; lng: number } & Place,
    opts: { idSuffix?: string; endpoint?: 'depart' | 'arrive' } = {},
  ): void => {
    order += 1;
    if (place.placeId) scheduledPlaceIds.add(place.placeId);
    lastLocation = place;
    points.push({
      kind: 'scheduled',
      id: `scheduled-${item.id}${opts.idSuffix ?? ''}`,
      itemId: item.id,
      itemKind: item.kind,
      order,
      startsAt: item.startsAt,
      endpoint: opts.endpoint,
      lat: place.lat,
      lng: place.lng,
      label: opts.endpoint ? place.label : item.title || place.label,
      address: place.address,
      placeId: place.placeId,
    });
  };

  for (const item of dayItems) {
    // Transport legs are pinned at both ends so the route shows from → to.
    // The depart end is skipped when it is at the same location as the previous
    // route stop (e.g. the lodging icon, or the arrive of the preceding leg).
    const endpoints = transportEndpoints(item);
    if (endpoints) {
      const from = isLocated(endpoints.from) ? endpoints.from : undefined;
      const to = isLocated(endpoints.to) ? endpoints.to : undefined;
      if (from && to) {
        if (!isSameRouteLocation(from, lastLocation)) {
          pushScheduled(item, from, {
            idSuffix: '-depart',
            endpoint: 'depart',
          });
        }
        pushScheduled(item, to, { idSuffix: '-arrive', endpoint: 'arrive' });
      } else if (from || to) {
        // Only one end is locatable: fall back to a single stop (if not a dupe).
        const single = (from ?? to)!;
        if (!isSameRouteLocation(single, lastLocation)) {
          pushScheduled(item, single);
        }
      } else {
        unlocatedCount += 1;
      }
      continue;
    }

    const place = itemPlace(item);
    if (!place) {
      unlocatedCount += 1;
      continue;
    }
    if (
      !isSameRouteLocation(
        place as { lat: number; lng: number; placeId?: string },
        lastLocation,
      )
    ) {
      pushScheduled(item, place as { lat: number; lng: number } & Place);
    }
  }

  // --- Lodging anchors (route start / end) ----------------------------------

  // Previous day's lodging as route start: pinned at order 0.
  // (prevLodging and prevLodgingPlace already computed above.)
  if (prevLodging) {
    const place = itemPlace(prevLodging);
    if (isLocated(place)) {
      points.push({
        kind: 'lodging',
        id: `lodging-prev-${prevLodging.id}`,
        itemId: prevLodging.id,
        order: 0,
        lat: place.lat,
        lng: place.lng,
        label: place.label || prevLodging.title,
        address: place.address,
        placeId: place.placeId,
      });
    }
  }

  // Current day's lodging: anchor pin and route end point.
  const lodging = lodgingForDay(trip, dayKey);
  if (lodging) {
    const place = itemPlace(lodging);
    if (place) {
      points.push({
        kind: 'lodging',
        id: `lodging-${lodging.id}`,
        itemId: lodging.id,
        order: order + 1,
        lat: place.lat!,
        lng: place.lng!,
        label: place.label || lodging.title,
        address: place.address,
        placeId: place.placeId,
      });
    } else {
      unlocatedCount += 1;
    }
  }

  // --- Wishlists for the day's cities ---------------------------------------
  const inDayCity = (p: { cityLabel: string; cityPlaceId?: string }): boolean =>
    cityKeys.has(cityKey(p));

  // Anchors the day's plan revolves around: scheduled stops + lodging. Used to
  // hint how close each wishlist place sits to what's already planned.
  const planAnchors: LngLat[] = points
    .filter((p) => p.kind === 'scheduled' || p.kind === 'lodging')
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const planDistance = (p: LngLat): number | undefined =>
    planAnchors.length > 0
      ? (nearestDistanceMeters(p, planAnchors) ?? undefined)
      : undefined;

  for (const fp of foodPlaces) {
    if (!inDayCity(fp)) continue;
    if (!isLocated(fp)) {
      unlocatedCount += 1;
      continue;
    }
    if (fp.placeId && scheduledPlaceIds.has(fp.placeId)) continue;
    points.push({
      kind: 'foodWish',
      id: `food-${fp.id}`,
      placeRefId: fp.id,
      lat: fp.lat,
      lng: fp.lng,
      label: fp.name,
      address: fp.address,
      placeId: fp.placeId,
      wantLevel: fp.wantLevel,
      category: fp.category,
      nearestPlanMeters: planDistance({ lat: fp.lat, lng: fp.lng }),
    });
  }

  for (const ap of activityPlaces) {
    if (!inDayCity(ap)) continue;
    if (!isLocated(ap)) {
      unlocatedCount += 1;
      continue;
    }
    if (ap.placeId && scheduledPlaceIds.has(ap.placeId)) continue;
    points.push({
      kind: 'activityWish',
      id: `activity-${ap.id}`,
      placeRefId: ap.id,
      lat: ap.lat,
      lng: ap.lng,
      label: ap.name,
      address: ap.address,
      placeId: ap.placeId,
      wantLevel: ap.wantLevel,
      category: ap.category,
      nearestPlanMeters: planDistance({ lat: ap.lat, lng: ap.lng }),
    });
  }

  return { points, unlocatedCount, cities };
}
