/**
 * Geographic distance helpers for the day map's proximity hints. Pure and
 * dependency-free so they can be unit-tested without a map renderer.
 */

export interface LngLat {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
/** Rough walking pace used for "~N min walk" estimates. */
const WALK_METERS_PER_MIN = 80;
/** A wishlist place within this straight-line distance reads as "near the plan". */
export const WALKABLE_THRESHOLD_M = 800;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates, in metres (haversine).
 * Straight-line only — not a routed/walking distance.
 */
export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest distance (m) from `point` to any of `targets`, or null if none. */
export function nearestDistanceMeters(
  point: LngLat,
  targets: readonly LngLat[],
): number | null {
  let nearest: number | null = null;
  for (const target of targets) {
    const d = haversineMeters(point, target);
    if (nearest === null || d < nearest) nearest = d;
  }
  return nearest;
}

/** Rough walking time in minutes for a straight-line distance in metres. */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / WALK_METERS_PER_MIN));
}

/** Human-friendly distance: "~450 m" under 1 km, "~1.2 km" above. */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `~${Math.round(meters / 10) * 10} m`;
  }
  return `~${(meters / 1000).toFixed(1)} km`;
}
