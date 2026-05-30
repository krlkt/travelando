import type { Place, TripItem } from './types';

/**
 * The primary A → B labels for an item's headline. For transport this is the
 * city pair (`fromCity`/`toCity`, which drives the trip's "City" logic); for
 * every other kind it's the place pair (`from`/`to`).
 */
export function routeHeadline(item: TripItem): {
  from?: Place;
  to?: Place;
} {
  if (item.kind === 'transport') {
    return { from: item.fromCity, to: item.toCity };
  }
  return { from: item.from, to: item.to };
}

/**
 * Optional station/airport waypoints for a transport item, shown as a secondary
 * detail line and used for map-view routing. Returns null when the item isn't
 * transport or has no station set.
 */
export function routeStations(item: TripItem): {
  from?: Place;
  to?: Place;
} | null {
  if (item.kind !== 'transport') return null;
  if (!item.from && !item.to) return null;
  return { from: item.from, to: item.to };
}
