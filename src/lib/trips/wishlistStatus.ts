import type { Place, TripItem } from './types';

/** Two venues within this distance are treated as the same place. */
const MATCH_RADIUS_METERS = 75;

/** Minimal shape needed to match — satisfied by FoodPlace and ActivityPlace. */
export interface MatchablePlace {
  placeId?: string;
  lat?: number;
  lng?: number;
  name: string;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function placeMatches(place: MatchablePlace, candidate: Place): boolean {
  // 1. Same Google place id — the strongest signal.
  if (
    place.placeId &&
    candidate.placeId &&
    place.placeId === candidate.placeId
  ) {
    return true;
  }
  // 2. Within a small radius by coordinates.
  if (
    place.lat != null &&
    place.lng != null &&
    candidate.lat != null &&
    candidate.lng != null
  ) {
    const distance = metersBetween(
      place.lat,
      place.lng,
      candidate.lat,
      candidate.lng,
    );
    if (distance <= MATCH_RADIUS_METERS) return true;
  }
  // 3. Same normalized name.
  const a = normalizeName(place.name);
  return a.length > 0 && a === normalizeName(candidate.label);
}

/**
 * True when any timeline item already references the same location as the
 * wishlist place. Matching priority: Google place id → coordinates → normalized
 * name. Only an item's venue endpoints (`from`/`to`) are considered, never the
 * transport city fields.
 */
export function isPlaceInTimeline(
  place: MatchablePlace,
  items: readonly TripItem[],
): boolean {
  return items.some(
    (item) =>
      (item.from != null && placeMatches(place, item.from)) ||
      (item.to != null && placeMatches(place, item.to)),
  );
}
