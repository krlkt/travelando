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
