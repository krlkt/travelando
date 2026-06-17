import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLACES_API = 'https://places.googleapis.com/v1/places';
const CACHE_DAYS = 30;

/** Cheap fields (Essentials/Pro SKU) — enough to locate and label a place. */
const BASIC_FIELDS = 'id,displayName,formattedAddress,location';

/**
 * Rich fields add the Enterprise-SKU data the wishlist cards/map need: rating,
 * opening hours, price level, a photo reference and contact links. Billed at a
 * higher per-call rate, so only requested with `?rich=1`. `utcOffsetMinutes`
 * lets the client compute the place's *local* "open now" without a timezone DB.
 */
const RICH_FIELDS = [
  BASIC_FIELDS,
  'rating',
  'userRatingCount',
  'priceLevel',
  'regularOpeningHours',
  'utcOffsetMinutes',
  'photos',
  'websiteUri',
  'internationalPhoneNumber',
  'googleMapsUri',
].join(',');

const TIER_BASIC = 0;
const TIER_RICH = 1;

/** Master off-switch — set PLACES_RICH_DETAILS=false to force the cheap tier. */
function richEnabled(): boolean {
  return process.env.PLACES_RICH_DETAILS !== 'false';
}

interface CachedRow {
  data: unknown;
  cached_at: string;
  tier: number | null;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'places_not_configured' },
      { status: 503 },
    );
  }

  const placeId = request.nextUrl.searchParams.get('placeId');
  if (!placeId) {
    return NextResponse.json(
      { success: false, error: 'placeId_required' },
      { status: 400 },
    );
  }

  const wantRich =
    request.nextUrl.searchParams.get('rich') === '1' && richEnabled();
  const wantTier = wantRich ? TIER_RICH : TIER_BASIC;

  const supabase = await createClient();

  // Serve from cache when fresh and at least as rich as requested. A tier-1 row
  // satisfies a tier-0 request, so basic callers never trigger a rich refetch.
  const { data: cached } = (await supabase
    .from('place_details_cache')
    .select('data, cached_at, tier')
    .eq('place_id', placeId)
    .maybeSingle()) as { data: CachedRow | null };

  const cachedTier = cached?.tier ?? TIER_BASIC;
  const isFresh =
    cached != null &&
    Date.now() - new Date(cached.cached_at).getTime() <
      CACHE_DAYS * 24 * 60 * 60 * 1000;

  if (cached && isFresh && cachedTier >= wantTier) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  // On a stale refetch, never downgrade an existing richer row.
  const fetchTier = Math.max(wantTier, cachedTier);
  const fields = fetchTier === TIER_RICH ? RICH_FIELDS : BASIC_FIELDS;

  try {
    const res = await fetch(`${PLACES_API}/${placeId}?fields=${fields}`, {
      headers: { 'X-Goog-Api-Key': apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `places_api_error: ${text}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    // Store in cache (fire-and-forget).
    supabase
      .from('place_details_cache')
      .upsert({
        place_id: placeId,
        data,
        cached_at: new Date().toISOString(),
        tier: fetchTier,
      })
      .then(() => {});

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
