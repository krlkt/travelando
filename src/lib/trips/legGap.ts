import type { Place, TripItem } from './types';
import { itemEndPlace, itemStartPlace } from './itemLocation';
import { isSamePlace } from '@/lib/places/samePlace';
import { buildDirectionsUrl, canRouteBetween } from '@/lib/places/maps-link';

/**
 * A pre-filled transport item ready to drop into the editor. Carries the two
 * endpoints (as "Depart from" / "Arrive at" places) plus best-guess times taken
 * from the surrounding timeline so the user only confirms the details.
 */
export interface TransportPrefill {
  kind: 'transport';
  from: Place;
  to: Place;
  startsAt?: string;
  endsAt?: string;
}

/**
 * The affordances offered on the connector between two stops: a Google Maps
 * directions link (when both ends are routable) and/or a "quick-add transport"
 * prefill (when no transport item already covers the leg).
 */
export interface LegGap {
  origin: Place;
  destination: Place;
  directionsUrl: string | null;
  prefill: TransportPrefill | null;
}

/** Keeps the later of two ISO times only when it is strictly after the earlier. */
function endIfAfter(
  start: string,
  end: string | undefined,
): string | undefined {
  if (!end) return undefined;
  return new Date(end).getTime() > new Date(start).getTime() ? end : undefined;
}

/**
 * The leg between two back-to-back timeline events. Returns `null` when the two
 * stops collapse to one place (nothing to route or add). A quick-add transport
 * prefill is offered only when neither neighbour is itself a transport item —
 * a transport neighbour already covers the journey.
 */
export function timelineLegGap(prev: TripItem, next: TripItem): LegGap | null {
  const origin = itemEndPlace(prev);
  const destination = itemStartPlace(next);
  if (!origin || !destination) return null;
  if (isSamePlace(origin, destination)) return null;

  const directionsUrl = canRouteBetween(origin, destination)
    ? buildDirectionsUrl(origin, destination)
    : null;

  const neighbourIsTransport =
    prev.kind === 'transport' || next.kind === 'transport';
  const prefill: TransportPrefill | null = neighbourIsTransport
    ? null
    : {
        kind: 'transport',
        from: origin,
        to: destination,
        startsAt: prev.endsAt ?? prev.startsAt,
        endsAt: endIfAfter(prev.endsAt ?? prev.startsAt, next.startsAt),
      };

  if (!directionsUrl && !prefill) return null;
  return { origin, destination, directionsUrl, prefill };
}

/**
 * The leg between the day's lodging and an event: `depart` runs hotel → first
 * stop (you head out in the morning), `arrive` runs last stop → hotel (you head
 * back at night). Returns `null` when the hotel and the stop are the same place.
 * Lodging legs always offer the quick-add transport prefill.
 */
export function hotelLegGap(
  lodging: TripItem,
  item: TripItem,
  direction: 'depart' | 'arrive',
): LegGap | null {
  const hotelPlace = itemEndPlace(lodging);
  if (!hotelPlace) return null;
  const itemPlace =
    direction === 'depart' ? itemStartPlace(item) : itemEndPlace(item);
  if (!itemPlace) return null;

  const origin = direction === 'depart' ? hotelPlace : itemPlace;
  const destination = direction === 'depart' ? itemPlace : hotelPlace;
  if (isSamePlace(origin, destination)) return null;

  const directionsUrl = canRouteBetween(origin, destination)
    ? buildDirectionsUrl(origin, destination)
    : null;

  const prefill: TransportPrefill = {
    kind: 'transport',
    from: origin,
    to: destination,
    startsAt:
      direction === 'arrive' ? (item.endsAt ?? item.startsAt) : undefined,
    endsAt: direction === 'depart' ? item.startsAt : undefined,
  };

  return { origin, destination, directionsUrl, prefill };
}
