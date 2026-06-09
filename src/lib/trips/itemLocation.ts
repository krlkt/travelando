import type { Place, TripItem } from './types';

/**
 * Where an item *begins* — the location you head to in order to start it.
 * For transport this is the departure waypoint; for everything else the single
 * place collapses to one value. Falls back to the destination when no origin is
 * set so single-location items still resolve.
 */
export function itemStartPlace(item: TripItem): Place | undefined {
  return item.from ?? item.to;
}

/**
 * Where an item *ends* — the location you are at once it's done. For transport
 * this is the arrival waypoint; for single-location items it collapses to the
 * one place. Falls back to the origin when no destination is set.
 */
export function itemEndPlace(item: TripItem): Place | undefined {
  return item.to ?? item.from;
}
