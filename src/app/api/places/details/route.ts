import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PLACES_API = 'https://places.googleapis.com/v1/places';
const CACHE_DAYS = 30;
const FIELDS = 'id,displayName,formattedAddress,location';

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

  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from('place_details_cache')
    .select('data, cached_at')
    .eq('place_id', placeId)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at as string).getTime();
    if (age < CACHE_DAYS * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ success: true, data: cached.data });
    }
  }

  try {
    const res = await fetch(`${PLACES_API}/${placeId}?fields=${FIELDS}`, {
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

    // Store in cache (fire-and-forget)
    supabase
      .from('place_details_cache')
      .upsert({ place_id: placeId, data, cached_at: new Date().toISOString() })
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
