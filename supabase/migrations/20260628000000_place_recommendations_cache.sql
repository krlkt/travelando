-- place_recommendations: caches AI-curated city recommendations to minimize
-- Google Places + Gemini API spend. Keyed by city (place id or lowercased
-- label) plus a hash of the personalization context, so identical requests
-- reuse the same curated pool. Mirrors place_details_cache.
create table public.place_recommendations (
  city_key text not null,
  context_hash text not null,
  data jsonb not null,
  cached_at timestamptz not null default now(),
  primary key (city_key, context_hash)
);

-- No RLS needed — this is a read-through cache keyed by public city/context,
-- holding only public place data (same model as place_details_cache).
