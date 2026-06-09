import type { Place } from '@/lib/trips/types';

type MapsLinkInput = Pick<
  Place,
  'label' | 'address' | 'lat' | 'lng' | 'placeId'
>;

export function isKnownPlace(place: MapsLinkInput): boolean {
  if (place.placeId) return true;
  if (typeof place.lat === 'number' && typeof place.lng === 'number') {
    return true;
  }
  return false;
}

export function buildMapsUrl(place: MapsLinkInput): string | null {
  const base = 'https://www.google.com/maps/search/?api=1';

  if (place.placeId) {
    const query =
      place.address ?? place.label ?? `${place.lat ?? ''},${place.lng ?? ''}`;
    return `${base}&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(
      place.placeId,
    )}`;
  }

  if (typeof place.lat === 'number' && typeof place.lng === 'number') {
    return `${base}&query=${place.lat},${place.lng}`;
  }

  return null;
}

/** The text token Google Maps uses to resolve a directions endpoint. */
function directionsToken(place: MapsLinkInput): string | null {
  if (typeof place.lat === 'number' && typeof place.lng === 'number') {
    return `${place.lat},${place.lng}`;
  }
  if (place.address) return place.address;
  if (place.label) return place.label;
  return null;
}

/**
 * True when both ends have enough information to plot a Google Maps route.
 * A bare label alone is not enough — we require coordinates, an address, or a
 * place id so the link points somewhere meaningful.
 */
export function canRouteBetween(
  origin: MapsLinkInput,
  destination: MapsLinkInput,
): boolean {
  return isRoutablePlace(origin) && isRoutablePlace(destination);
}

/**
 * Builds a Google Maps directions deep link from `origin` to `destination`.
 * Each endpoint resolves to `lat,lng` first, then address, then label; a known
 * `placeId` is attached via `*_place_id` to improve resolution. Returns `null`
 * when either end has no usable token.
 */
export function buildDirectionsUrl(
  origin: MapsLinkInput,
  destination: MapsLinkInput,
): string | null {
  const originToken = directionsToken(origin);
  const destinationToken = directionsToken(destination);
  if (!originToken || !destinationToken) return null;

  const params = new URLSearchParams({
    api: '1',
    origin: originToken,
    destination: destinationToken,
  });
  if (origin.placeId) params.set('origin_place_id', origin.placeId);
  if (destination.placeId) {
    params.set('destination_place_id', destination.placeId);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Directions link to a single destination with the origin left unset, so Google
 * Maps routes from the device's live location. Ideal for "navigate me to my
 * next stop" from a real-time context. Returns `null` when the destination has
 * no usable token.
 */
export function buildDirectionsToUrl(
  destination: MapsLinkInput,
): string | null {
  const token = directionsToken(destination);
  if (!token) return null;

  const params = new URLSearchParams({ api: '1', destination: token });
  if (destination.placeId) {
    params.set('destination_place_id', destination.placeId);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** True when a place can be used as a directions endpoint. */
export function isRoutablePlace(place: MapsLinkInput): boolean {
  return isKnownPlace(place) || !!place.address;
}

/** Opens a maps URL: same-tab on touch devices, new tab on desktop. */
export function openMapsLink(url: string): void {
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
