import type { TripItem } from './types';
import { itemStartPlace } from './itemLocation';
import { transportEndpoints } from './transportRoute';
import {
  buildDirectionsToUrl,
  buildDirectionsUrl,
  isRoutablePlace,
} from '@/lib/places/maps-link';

/**
 * The directions affordance an item should offer:
 *  - `navigate` — a single destination to route *to* from the viewer's current
 *    location (activities, meals, lodging).
 *  - `route` — a transport item already *is* an A → B journey, so we surface
 *    that leg's own from → to route rather than a "navigate to it" link.
 */
export type ItemDirections =
  | { kind: 'navigate'; url: string; toLabel: string }
  | { kind: 'route'; url: string; fromLabel: string; toLabel: string };

/**
 * Resolves the right Google Maps directions intent for an item, or `null` when
 * the item has no usable location. Keeps the "transport is the journey" rule in
 * one place so every surface (live view, etc.) handles it consistently.
 */
export function directionsForItem(item: TripItem): ItemDirections | null {
  if (item.kind === 'transport') {
    const ends = transportEndpoints(item);
    if (ends?.from && ends?.to) {
      const url = buildDirectionsUrl(ends.from, ends.to);
      if (url) {
        return {
          kind: 'route',
          url,
          fromLabel: ends.from.label,
          toLabel: ends.to.label,
        };
      }
    }
    return null;
  }

  const place = itemStartPlace(item);
  if (place && isRoutablePlace(place)) {
    const url = buildDirectionsToUrl(place);
    if (url) return { kind: 'navigate', url, toLabel: place.label };
  }
  return null;
}
