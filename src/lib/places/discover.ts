import type {
  ActivityPlaceCategory,
  FoodPlaceCategory,
  RecommendationContext,
  TravelCompanion,
} from '@/lib/trips/types';

/**
 * Server-side city discovery via Google Places **Text Search (New)**. We query
 * for real, currently-listed places (ranked by Google's own popularity signal),
 * then map each place's `types` onto our wishlist categories. This grounds the
 * downstream LLM in places that actually exist and are open — it only ranks and
 * annotates this pool, it never invents entries.
 */

const TEXT_SEARCH_API = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Field mask drives Text Search billing — request only what the recommendation
 * card and ranking need. `types`/`primaryType` let us bucket food vs activity.
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.primaryType',
].join(',');

/** A real place returned by Text Search, normalized and pre-classified. */
export interface Candidate {
  placeId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  userRatingCount?: number;
  kind: 'food' | 'activity';
  category: FoodPlaceCategory | ActivityPlaceCategory;
}

/** A discovery query plus how many places we want back for it. */
interface SearchQuery {
  query: string;
}

/** Companion type → extra search terms that bias what Google returns. */
const COMPANION_BIAS: Record<TravelCompanion, string> = {
  solo: '',
  partner: 'romantic',
  friends: 'fun popular',
  family: 'family friendly',
};

/** Up to this many free-text interests are turned into their own queries. */
const MAX_INTEREST_QUERIES = 3;
/** Total candidates fed to the LLM — enough breadth, small enough to stay cheap. */
export const MAX_CANDIDATES = 24;

function splitInterests(interests: string): string[] {
  return interests
    .split(/[,;/]|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_INTEREST_QUERIES);
}

/**
 * Builds the set of Text Search queries for a city. When the traveller names
 * specific interests ("ramen", "temples"), we search for *those* directly and
 * nothing else — otherwise the broad "attractions"/"eat" queries flood the pool
 * with high-review landmarks that outrank the thing they actually asked for.
 * With no interests, we fall back to the two broad must-do queries. The
 * companion bias is folded into every query.
 */
export function buildSearchQueries(
  city: string,
  context: RecommendationContext,
): SearchQuery[] {
  const bias = context.companions ? COMPANION_BIAS[context.companions] : '';
  const prefix = bias ? `${bias} ` : '';

  const interests = context.interests ? splitInterests(context.interests) : [];
  if (interests.length > 0) {
    return interests.map((interest) => ({
      query: `${prefix}${interest} in ${city}`,
    }));
  }

  return [
    { query: `${prefix}top attractions and things to do in ${city}` },
    { query: `${prefix}best places to eat in ${city}` },
  ];
}

/** Google primary/`types` token → our wishlist kind + category. */
const TYPE_MAP: Record<
  string,
  {
    kind: 'food' | 'activity';
    category: FoodPlaceCategory | ActivityPlaceCategory;
  }
> = {
  restaurant: { kind: 'food', category: 'restaurant' },
  fine_dining_restaurant: { kind: 'food', category: 'restaurant' },
  cafe: { kind: 'food', category: 'cafe' },
  coffee_shop: { kind: 'food', category: 'cafe' },
  bakery: { kind: 'food', category: 'cafe' },
  bar: { kind: 'food', category: 'bar' },
  pub: { kind: 'food', category: 'bar' },
  meal_takeaway: { kind: 'food', category: 'food' },
  food: { kind: 'food', category: 'food' },
  night_club: { kind: 'activity', category: 'nightlife' },
  museum: { kind: 'activity', category: 'museum' },
  art_gallery: { kind: 'activity', category: 'museum' },
  park: { kind: 'activity', category: 'outdoor' },
  national_park: { kind: 'activity', category: 'outdoor' },
  hiking_area: { kind: 'activity', category: 'outdoor' },
  beach: { kind: 'activity', category: 'outdoor' },
  amusement_park: { kind: 'activity', category: 'entertainment' },
  movie_theater: { kind: 'activity', category: 'entertainment' },
  zoo: { kind: 'activity', category: 'entertainment' },
  aquarium: { kind: 'activity', category: 'entertainment' },
  shopping_mall: { kind: 'activity', category: 'shopping' },
  market: { kind: 'activity', category: 'shopping' },
  store: { kind: 'activity', category: 'shopping' },
  tourist_attraction: { kind: 'activity', category: 'sightseeing' },
  historical_landmark: { kind: 'activity', category: 'sightseeing' },
  church: { kind: 'activity', category: 'sightseeing' },
  place_of_worship: { kind: 'activity', category: 'sightseeing' },
};

/**
 * Classifies a place from its Google types. Prefers `primaryType`, then scans
 * the `types` array, then falls back to generic sightseeing — so an unmapped
 * point of interest still lands in the activity wishlist rather than vanishing.
 */
export function classifyPlace(
  types: readonly string[] | undefined,
  primaryType: string | undefined,
): {
  kind: 'food' | 'activity';
  category: FoodPlaceCategory | ActivityPlaceCategory;
} {
  if (primaryType && TYPE_MAP[primaryType]) return TYPE_MAP[primaryType];
  for (const t of types ?? []) {
    if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  return { kind: 'activity', category: 'sightseeing' };
}

/**
 * Popularity score: rating weighted by how many people rated it (log-scaled so a
 * 4.9 with 30 reviews doesn't outrank a 4.6 with 12,000). Used to rank the pool
 * before it reaches the LLM, and as the final order on the rule-based fallback.
 */
export function scorePlace(
  rating: number | undefined,
  userRatingCount: number | undefined,
): number {
  return (rating ?? 0) * Math.log10((userRatingCount ?? 0) + 1);
}

/** Dedupes by placeId (keeping the first/highest-ranked) and sorts by score. */
export function rankCandidates(candidates: readonly Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const unique: Candidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.placeId)) continue;
    seen.add(c.placeId);
    unique.push(c);
  }
  return unique.sort(
    (a, b) =>
      scorePlace(b.rating, b.userRatingCount) -
      scorePlace(a.rating, a.userRatingCount),
  );
}

interface GoogleTextSearchPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryType?: string;
}

/** Normalizes one Google Text Search place into a {@link Candidate}. */
export function parseTextSearchPlace(
  place: GoogleTextSearchPlace,
): Candidate | null {
  const placeId = place.id;
  const name = place.displayName?.text;
  if (!placeId || !name) return null;
  const { kind, category } = classifyPlace(place.types, place.primaryType);
  return {
    placeId,
    name,
    address: place.formattedAddress,
    lat: place.location?.latitude,
    lng: place.location?.longitude,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    kind,
    category,
  };
}

async function runTextSearch(
  apiKey: string,
  query: string,
): Promise<Candidate[]> {
  const res = await fetch(TEXT_SEARCH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`places_text_search_error: ${text}`);
  }
  const json = (await res.json()) as { places?: GoogleTextSearchPlace[] };
  return (json.places ?? [])
    .map(parseTextSearchPlace)
    .filter((c): c is Candidate => c !== null);
}

/**
 * Discovers a ranked pool of real places for a city. Runs all queries in
 * parallel, tolerating individual query failures so one bad query never sinks
 * the whole request, then dedupes, ranks and caps the pool.
 */
export async function discoverPlaces(
  apiKey: string,
  city: string,
  context: RecommendationContext,
): Promise<Candidate[]> {
  const queries = buildSearchQueries(city, context);
  const results = await Promise.allSettled(
    queries.map((q) => runTextSearch(apiKey, q.query)),
  );
  const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  return rankCandidates(all).slice(0, MAX_CANDIDATES);
}
