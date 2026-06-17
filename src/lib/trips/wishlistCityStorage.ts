/**
 * Per-trip persistence of the last-viewed city on the wishlist page.
 *
 * City keys are stable (`cityPlaceId` when present, else `cityLabel`; see
 * `entryCityKey`), so a stored value survives refreshes. The selection logic
 * lives here as pure functions so it can be unit-tested without a DOM.
 */

const ACTIVE_CITY_PREFIX = 'travelando:wishlistCity:';

/** Build the `localStorage` key for a trip's last-viewed wishlist city. */
export function buildWishlistCityKey(tripId: string): string {
  return `${ACTIVE_CITY_PREFIX}${tripId}`;
}

interface PickInitialCityArgs {
  stored: string | null;
  validKeys: readonly string[];
  fallback: string;
}

/**
 * Choose which city to show. A stored city wins when it is still a valid city
 * for the trip; otherwise fall back to the caller's default (typically the
 * first city in itinerary order).
 */
export function pickInitialCity({
  stored,
  validKeys,
  fallback,
}: PickInitialCityArgs): string {
  if (stored && validKeys.includes(stored)) {
    return stored;
  }
  return fallback;
}
