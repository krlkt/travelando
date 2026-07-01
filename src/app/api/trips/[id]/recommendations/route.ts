import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recommendationRequestSchema } from '@/lib/trips/schemas';
import { discoverPlaces } from '@/lib/places/discover';
import { generateJson, geminiEnabled } from '@/lib/ai/gemini';
import {
  RECOMMEND_RESPONSE_SCHEMA,
  buildRecommendPrompt,
  fallbackRecommendations,
  parseGeminiPicks,
} from '@/lib/ai/recommendPrompt';
import type { Recommendation, RecommendationContext } from '@/lib/trips/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const CACHE_DAYS = 30;

interface CachedRow {
  data: Recommendation[];
  cached_at: string;
}

/**
 * Stable cache key for a context, so identical requests reuse the cached pool.
 * City is keyed by place id when available (label otherwise), and the
 * personalization fields are normalized into one short, order-stable string.
 */
function cacheKeys(
  request: { cityLabel: string; cityPlaceId?: string },
  context: RecommendationContext,
): { cityKey: string; contextHash: string } {
  const cityKey = request.cityPlaceId ?? request.cityLabel.trim().toLowerCase();
  const contextHash = [
    context.companions ?? 'any',
    context.groupSize ?? 0,
    (context.ageRange ?? 'any').trim().toLowerCase(),
    (context.interests ?? '').trim().toLowerCase().replace(/\s+/g, ' '),
  ].join('|');
  return { cityKey, contextHash };
}

/**
 * Returns AI-curated, wishlist-ready recommendations for a city. Pipeline:
 * Supabase cache → Google Places Text Search (grounding) → Gemini rank/annotate
 * → rule-based fallback. The LLM tier is best-effort; any failure degrades to
 * the popularity-ranked pool rather than failing the request.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  // tripId scopes the request to an authenticated trip context (not persisted).
  await context.params;

  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!placesKey) {
    return NextResponse.json(
      { success: false, error: 'places_not_configured' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const parsed = recommendationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_failed',
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const { cityLabel, cityPlaceId, ...rawContext } = parsed.data;
  const recContext: RecommendationContext = rawContext;
  const { cityKey, contextHash } = cacheKeys(
    { cityLabel, cityPlaceId },
    recContext,
  );

  // Serve fresh cache.
  const { data: cached } = (await supabase
    .from('place_recommendations')
    .select('data, cached_at')
    .eq('city_key', cityKey)
    .eq('context_hash', contextHash)
    .maybeSingle()) as { data: CachedRow | null };

  const isFresh =
    cached != null &&
    Date.now() - new Date(cached.cached_at).getTime() <
      CACHE_DAYS * 24 * 60 * 60 * 1000;
  if (cached && isFresh) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  try {
    const candidates = await discoverPlaces(placesKey, cityLabel, recContext);
    if (candidates.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    let recommendations = fallbackRecommendations(candidates);
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (geminiEnabled() && geminiKey) {
      try {
        const prompt = buildRecommendPrompt(cityLabel, recContext, candidates);
        const raw = await generateJson(
          geminiKey,
          prompt,
          RECOMMEND_RESPONSE_SCHEMA,
        );
        const picks = parseGeminiPicks(raw, candidates);
        if (picks.length > 0) recommendations = picks;
      } catch {
        // Keep the rule-based fallback — the LLM tier is non-essential.
      }
    }

    // Cache (fire-and-forget).
    supabase
      .from('place_recommendations')
      .upsert({
        city_key: cityKey,
        context_hash: contextHash,
        data: recommendations,
        cached_at: new Date().toISOString(),
      })
      .then(() => {});

    return NextResponse.json({ success: true, data: recommendations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
