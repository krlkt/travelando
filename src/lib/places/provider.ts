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

export interface PlacesProvider {
  autocomplete(
    query: string,
    sessionToken?: string,
  ): Promise<PlaceSuggestion[]>;
  getDetails(
    placeId: string,
    sessionToken?: string,
  ): Promise<PlaceDetail | null>;
}

export const manualProvider: PlacesProvider = {
  async autocomplete() {
    return [];
  },
  async getDetails() {
    return null;
  },
};

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

  async getDetails(placeId, _sessionToken) {
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
};

export function getPlacesProvider(): PlacesProvider {
  if (typeof window === 'undefined') return manualProvider;
  // googleProvider gracefully falls back to empty results if API key is missing server-side
  return googleProvider;
}
