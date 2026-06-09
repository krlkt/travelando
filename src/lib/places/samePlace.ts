import type { Place } from '@/lib/trips/types';
import { haversineMeters } from '@/lib/map/distance';

type PlaceLike = Pick<Place, 'label' | 'lat' | 'lng' | 'placeId'>;

/** Two stops within this straight-line distance are treated as one location. */
const SAME_PLACE_METERS = 60;

function hasCoords(
  p: PlaceLike,
): p is PlaceLike & { lat: number; lng: number } {
  return (
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng)
  );
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * True when two places represent the same geographic location. Prefers the most
 * reliable signal available: matching `placeId`, then coordinates within
 * {@link SAME_PLACE_METERS}, then an exact (case-insensitive) label match for
 * places that only carry a name. Used to suppress redundant A → A directions
 * links (e.g. transport B → B between two back-to-back legs).
 */
export function isSamePlace(a: PlaceLike, b: PlaceLike): boolean {
  if (a.placeId && b.placeId) return a.placeId === b.placeId;
  if (hasCoords(a) && hasCoords(b)) {
    return haversineMeters(a, b) < SAME_PLACE_METERS;
  }
  if (a.label && b.label)
    return normalizeLabel(a.label) === normalizeLabel(b.label);
  return false;
}
