import type { ItemDraft } from './types';
import type { WishlistEntry } from './wishlistItems';

interface DraftTimes {
  /** Naive wall-time start, e.g. `2026-06-01T10:00:00`. */
  startsAt: string;
  /** Optional naive wall-time end. */
  endsAt?: string;
}

/**
 * Turns a wishlist place into a timeline {@link ItemDraft} at the given times.
 * Food entries become meals, activities become activities; the place itself is
 * stored as the item's arrival venue (`to`) so map routing and the
 * "already in your plan" check line up with the wishlist. Shared by the map's
 * "add to this day" sheet and the wishlist card, so the two never drift.
 */
export function wishlistEntryToItemDraft(
  entry: WishlistEntry,
  { startsAt, endsAt }: DraftTimes,
): ItemDraft {
  return {
    kind: entry.kind === 'food' ? 'meal' : 'activity',
    title: entry.name,
    startsAt,
    endsAt,
    to: {
      label: entry.name,
      address: entry.address,
      lat: entry.lat,
      lng: entry.lng,
      placeId: entry.placeId,
    },
  };
}
