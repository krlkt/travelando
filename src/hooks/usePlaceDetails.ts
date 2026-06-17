'use client';

import { useEffect, useState } from 'react';
import { getPlacesProvider, type PlaceRichDetail } from '@/lib/places/provider';

/**
 * Lazily fetches enriched Google place details (rating, opening hours, photo)
 * for a `placeId`. Results are memoized at module scope and in-flight requests
 * are deduped, so many wishlist cards/pins sharing a place trigger exactly one
 * network call, and re-mounts resolve instantly from cache.
 *
 * Pass `null`/`undefined` to skip fetching (e.g. a manually-added place with no
 * Google id). The hook never throws — failures resolve to `null`.
 */
const cache = new Map<string, PlaceRichDetail | null>();
const inFlight = new Map<string, Promise<PlaceRichDetail | null>>();

function load(placeId: string): Promise<PlaceRichDetail | null> {
  if (cache.has(placeId)) {
    return Promise.resolve(cache.get(placeId) ?? null);
  }
  const existing = inFlight.get(placeId);
  if (existing) return existing;

  const promise = getPlacesProvider()
    .getRichDetails(placeId)
    .then((detail) => {
      cache.set(placeId, detail);
      inFlight.delete(placeId);
      return detail;
    })
    .catch(() => {
      inFlight.delete(placeId);
      return null;
    });

  inFlight.set(placeId, promise);
  return promise;
}

export interface UsePlaceDetailsResult {
  detail: PlaceRichDetail | null;
  isLoading: boolean;
}

export function usePlaceDetails(
  placeId: string | null | undefined,
  enabled = true,
): UsePlaceDetailsResult {
  const [detail, setDetail] = useState<PlaceRichDetail | null>(() =>
    placeId ? (cache.get(placeId) ?? null) : null,
  );
  const [isLoading, setIsLoading] = useState(
    () => !!placeId && enabled && !cache.has(placeId),
  );

  useEffect(() => {
    if (!placeId || !enabled) return;

    // `load` resolves from the module cache on a microtask when already known,
    // so setState stays in the promise callback (never synchronously in the
    // effect body) and re-mounts settle without a flash.
    let active = true;
    load(placeId).then((result) => {
      if (!active) return;
      setDetail(result);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [placeId, enabled]);

  return { detail, isLoading };
}
