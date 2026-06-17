import type { RegularOpeningHours } from './openingHours';

export interface PlaceSuggestion {
  placeId: string;
  label: string;
  description: string;
}

export interface PlaceDetail {
  placeId: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}

/**
 * Enriched details for a wishlist place. Extends the basic locate-and-label
 * fields with Google's Enterprise-SKU data (rating, hours, photo, contact).
 * Every rich field is optional — Google omits what it doesn't have.
 */
export interface PlaceRichDetail extends PlaceDetail {
  /** Average rating, 1.0–5.0. */
  rating?: number;
  userRatingCount?: number;
  /** Normalized 0 (free) – 4 (very expensive). */
  priceLevel?: number;
  openingHours?: RegularOpeningHours;
  /** Minutes east of UTC for the place — used to compute its local "now". */
  utcOffsetMinutes?: number;
  /** First photo resource name (`places/{id}/photos/{ref}`), if any. */
  photoName?: string;
  websiteUri?: string;
  phone?: string;
  googleMapsUri?: string;
}

export interface PlacesProvider {
  autocomplete(
    query: string,
    sessionToken?: string,
  ): Promise<PlaceSuggestion[]>;
  getDetails(
    placeId: string,
    sessionToken?: string,
  ): Promise<PlaceDetail | null>;
  getRichDetails(placeId: string): Promise<PlaceRichDetail | null>;
}

export const manualProvider: PlacesProvider = {
  async autocomplete() {
    return [];
  },
  async getDetails() {
    return null;
  },
  async getRichDetails() {
    return null;
  },
};

/** Google's `PRICE_LEVEL_*` enum → normalized 0 (free) … 4 (very expensive). */
const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function parseGoogleRichDetail(
  data: Record<string, unknown>,
): PlaceRichDetail | null {
  const base = parseGoogleDetail(data);
  if (!base) return null;

  const priceLevelRaw = data.priceLevel as string | undefined;
  const photos = data.photos as Array<Record<string, unknown>> | undefined;
  const photoName = photos?.[0]?.name as string | undefined;

  return {
    ...base,
    rating: data.rating as number | undefined,
    userRatingCount: data.userRatingCount as number | undefined,
    priceLevel: priceLevelRaw ? PRICE_LEVELS[priceLevelRaw] : undefined,
    openingHours: data.regularOpeningHours as
      | PlaceRichDetail['openingHours']
      | undefined,
    utcOffsetMinutes: data.utcOffsetMinutes as number | undefined,
    photoName,
    websiteUri: data.websiteUri as string | undefined,
    phone: data.internationalPhoneNumber as string | undefined,
    googleMapsUri: data.googleMapsUri as string | undefined,
  };
}

function parseGoogleSuggestion(
  item: Record<string, unknown>,
): PlaceSuggestion | null {
  const placeId = item.placeId as string | undefined;
  const structuredFormat = item.structuredFormat as
    | Record<string, unknown>
    | undefined;
  const mainText = (structuredFormat?.mainText as Record<string, unknown>)
    ?.text as string | undefined;
  const secondaryText = (
    structuredFormat?.secondaryText as Record<string, unknown>
  )?.text as string | undefined;
  if (!placeId || !mainText) return null;
  return {
    placeId,
    label: mainText,
    description: secondaryText ? `${mainText}, ${secondaryText}` : mainText,
  };
}

function parseGoogleDetail(data: Record<string, unknown>): PlaceDetail | null {
  const placeId = data.id as string | undefined;
  const displayName = data.displayName as Record<string, unknown> | undefined;
  const label = displayName?.text as string | undefined;
  const address = data.formattedAddress as string | undefined;
  const location = data.location as Record<string, unknown> | undefined;
  if (!placeId || !label) return null;
  return {
    placeId,
    label,
    address: address ?? label,
    lat: location?.latitude as number | undefined,
    lng: location?.longitude as number | undefined,
  };
}

export const googleProvider: PlacesProvider = {
  async autocomplete(query, sessionToken) {
    try {
      const body: Record<string, unknown> = { input: query };
      if (sessionToken) body.sessionToken = sessionToken;

      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return [];
      const json = await res.json();
      if (!json.success || !json.data?.suggestions) return [];
      return (json.data.suggestions as Record<string, unknown>[])
        .map((s) =>
          parseGoogleSuggestion(
            (s.placePrediction ?? s) as Record<string, unknown>,
          ),
        )
        .filter((s): s is PlaceSuggestion => s !== null);
    } catch {
      return [];
    }
  },

  async getDetails(placeId) {
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(placeId)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success || !json.data) return null;
      return parseGoogleDetail(json.data as Record<string, unknown>);
    } catch {
      return null;
    }
  },

  async getRichDetails(placeId) {
    try {
      const res = await fetch(
        `/api/places/details?placeId=${encodeURIComponent(placeId)}&rich=1`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success || !json.data) return null;
      return parseGoogleRichDetail(json.data as Record<string, unknown>);
    } catch {
      return null;
    }
  },
};

export function getPlacesProvider(): PlacesProvider {
  if (typeof window === 'undefined') return manualProvider;
  // googleProvider gracefully falls back to empty results if API key is missing server-side
  return googleProvider;
}
