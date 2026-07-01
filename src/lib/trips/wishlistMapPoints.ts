import type { ActivityPlaceCategory, FoodPlaceCategory } from './types';
import type { WishlistEntry } from './wishlistItems';
import type { ActivityWishMapPoint, FoodWishMapPoint } from './dayMapPoints';

/** A wishlist pin plotted on the city wishlist map. Reuses the day-map wish
 *  point shapes so the existing `DayMapCanvas` renderer and marker styling work
 *  unchanged — but without any route anchors, so no lines are drawn. */
export type WishlistMapPoint = FoodWishMapPoint | ActivityWishMapPoint;

export interface WishlistMapData {
  points: WishlistMapPoint[];
  /** Entries in the list that lack coordinates and so can't be pinned. */
  unlocatedCount: number;
}

function isLocated(
  entry: WishlistEntry,
): entry is WishlistEntry & { lat: number; lng: number } {
  return (
    typeof entry.lat === 'number' &&
    typeof entry.lng === 'number' &&
    Number.isFinite(entry.lat) &&
    Number.isFinite(entry.lng)
  );
}

/**
 * Maps unified wishlist entries to map pins for the city wishlist map. Pure and
 * side-effect free so it can be unit-tested without a renderer. Only located
 * entries become pins; the rest are counted so the UI can surface them.
 *
 * `plannedIds` marks entries already represented by a timeline item so the
 * marker shows its "in plan" badge — matching the wishlist list's treatment.
 */
export function buildWishlistMapPoints(
  entries: readonly WishlistEntry[],
  plannedIds: ReadonlySet<string> = new Set(),
): WishlistMapData {
  const points: WishlistMapPoint[] = [];
  let unlocatedCount = 0;

  for (const entry of entries) {
    if (!isLocated(entry)) {
      unlocatedCount += 1;
      continue;
    }

    const base = {
      id: `${entry.kind}-${entry.id}`,
      placeRefId: entry.id,
      lat: entry.lat,
      lng: entry.lng,
      label: entry.name,
      address: entry.address,
      placeId: entry.placeId,
      wantLevel: entry.wantLevel,
      inPlan: plannedIds.has(entry.id),
    };

    if (entry.kind === 'food') {
      points.push({
        ...base,
        kind: 'foodWish',
        category: entry.category as FoodPlaceCategory | undefined,
      });
    } else {
      points.push({
        ...base,
        kind: 'activityWish',
        category: entry.category as ActivityPlaceCategory | undefined,
      });
    }
  }

  return { points, unlocatedCount };
}
