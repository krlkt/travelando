import type { ActivityPlaceCategory, FoodPlaceCategory } from './types';
import type { DayMapPoint } from './dayMapPoints';

/** Primary wishlist visibility mode for the day map. */
export type WishKindFilter = 'all' | 'food' | 'activity' | 'none';

/**
 * Which wishlist pins the day map should render. `kind` is the primary toggle;
 * the per-type category sets refine it. A `null` category set means "all
 * categories of this type" (the default), distinct from an empty set, which
 * hides every category of that type.
 */
export interface WishlistFilter {
  kind: WishKindFilter;
  foodCategories: ReadonlySet<FoodPlaceCategory> | null;
  activityCategories: ReadonlySet<ActivityPlaceCategory> | null;
}

export const DEFAULT_WISHLIST_FILTER: WishlistFilter = {
  kind: 'all',
  foodCategories: null,
  activityCategories: null,
};

/** Undefined categories bucket as `other`, mirroring the marker glyph fallback. */
function foodCategoryOf(category?: FoodPlaceCategory): FoodPlaceCategory {
  return category ?? 'other';
}

function activityCategoryOf(
  category?: ActivityPlaceCategory,
): ActivityPlaceCategory {
  return category ?? 'other';
}

/** True when the primary toggle enables food wishlist pins. */
function foodKindEnabled(kind: WishKindFilter): boolean {
  return kind === 'all' || kind === 'food';
}

/** True when the primary toggle enables activity wishlist pins. */
function activityKindEnabled(kind: WishKindFilter): boolean {
  return kind === 'all' || kind === 'activity';
}

/** Whether a single point passes the filter (non-wish points always pass). */
function isPointVisible(point: DayMapPoint, filter: WishlistFilter): boolean {
  if (point.kind === 'foodWish') {
    if (!foodKindEnabled(filter.kind)) return false;
    if (filter.foodCategories === null) return true;
    return filter.foodCategories.has(foodCategoryOf(point.category));
  }
  if (point.kind === 'activityWish') {
    if (!activityKindEnabled(filter.kind)) return false;
    if (filter.activityCategories === null) return true;
    return filter.activityCategories.has(activityCategoryOf(point.category));
  }
  return true;
}

/** Returns the subset of points the filter keeps visible. Pure. */
export function filterDayMapPoints(
  points: readonly DayMapPoint[],
  filter: WishlistFilter,
): DayMapPoint[] {
  return points.filter((p) => isPointVisible(p, filter));
}

/** A wishlist category present in the day, with how many pins carry it. */
export interface WishCategoryCount<T extends string> {
  value: T;
  count: number;
}

export interface AvailableWishCategories {
  food: WishCategoryCount<FoodPlaceCategory>[];
  activity: WishCategoryCount<ActivityPlaceCategory>[];
  foodTotal: number;
  activityTotal: number;
}

/**
 * Derives the wishlist categories actually present in `points`, with per-category
 * counts, so the UI can show chips only for categories that exist this day.
 * Order follows first appearance in `points`.
 */
export function availableWishCategories(
  points: readonly DayMapPoint[],
): AvailableWishCategories {
  const food = new Map<FoodPlaceCategory, number>();
  const activity = new Map<ActivityPlaceCategory, number>();

  for (const p of points) {
    if (p.kind === 'foodWish') {
      const c = foodCategoryOf(p.category);
      food.set(c, (food.get(c) ?? 0) + 1);
    } else if (p.kind === 'activityWish') {
      const c = activityCategoryOf(p.category);
      activity.set(c, (activity.get(c) ?? 0) + 1);
    }
  }

  const toCounts = <T extends string>(
    m: Map<T, number>,
  ): WishCategoryCount<T>[] =>
    Array.from(m, ([value, count]) => ({ value, count }));

  const foodCounts = toCounts(food);
  const activityCounts = toCounts(activity);

  return {
    food: foodCounts,
    activity: activityCounts,
    foodTotal: foodCounts.reduce((s, c) => s + c.count, 0),
    activityTotal: activityCounts.reduce((s, c) => s + c.count, 0),
  };
}
