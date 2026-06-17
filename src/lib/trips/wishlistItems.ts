import type {
  ActivityPlace,
  ActivityPlaceCategory,
  FoodPlace,
  FoodPlaceCategory,
} from './types';
import { activityCategoryLabel, foodCategoryLabel } from './categoryLabels';

/** Which wishlist table an entry came from. */
export type WishlistKind = 'food' | 'activity';

export type WishlistCategory = FoodPlaceCategory | ActivityPlaceCategory;

/**
 * A food or activity wishlist place flattened into one shape, so the dedicated
 * wishlists page can render, filter and sort both kinds together. `kind`
 * preserves which table the entry belongs to (for editing, glyphs and the
 * craving-meter variant); `id` stays the original row id.
 */
export interface WishlistEntry {
  id: string;
  kind: WishlistKind;
  tripId: string;
  cityLabel: string;
  cityPlaceId?: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  notes?: string;
  category?: WishlistCategory;
  wantLevel?: number;
}

export function foodToEntry(place: FoodPlace): WishlistEntry {
  return { ...place, kind: 'food' };
}

export function activityToEntry(place: ActivityPlace): WishlistEntry {
  return { ...place, kind: 'activity' };
}

/** Merges both wishlist tables into a single list of unified entries. */
export function mergeWishlist(
  foodPlaces: readonly FoodPlace[],
  activityPlaces: readonly ActivityPlace[],
): WishlistEntry[] {
  return [
    ...foodPlaces.map(foodToEntry),
    ...activityPlaces.map(activityToEntry),
  ];
}

/** Human label for an entry's category, dispatching on its kind. */
export function wishlistCategoryLabel(entry: WishlistEntry): string | null {
  if (!entry.category) return null;
  return entry.kind === 'food'
    ? foodCategoryLabel(entry.category as FoodPlaceCategory)
    : activityCategoryLabel(entry.category as ActivityPlaceCategory);
}
