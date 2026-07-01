import type { Candidate } from '@/lib/places/discover';
import type { GeminiSchema } from './gemini';
import type { Recommendation, RecommendationContext } from '@/lib/trips/types';

/**
 * Prompt construction + response parsing for the Gemini recommendation tier.
 * Pure functions only (no network), so the ranking logic is unit-testable and
 * the LLM is constrained to *picking from* and *annotating* the grounded
 * candidate pool — it returns place ids, never new places.
 */

/** How many recommendations we ask the model to return. */
export const RECOMMEND_LIMIT = 8;

/** Gemini structured-output schema: an ordered list of picks with reasons. */
export const RECOMMEND_RESPONSE_SCHEMA: GeminiSchema = {
  type: 'object',
  properties: {
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          placeId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['placeId', 'reason'],
      },
    },
  },
  required: ['picks'],
};

function describeContext(context: RecommendationContext): string {
  const parts: string[] = [];
  if (context.interests) parts.push(`Interests: ${context.interests}`);
  if (context.companions) parts.push(`Travelling with: ${context.companions}`);
  if (context.groupSize) parts.push(`Group size: ${context.groupSize}`);
  if (context.ageRange) parts.push(`Age range: ${context.ageRange}`);
  return parts.length > 0
    ? parts.join('\n')
    : 'No preferences given — pick the universal must-dos.';
}

/**
 * Builds the LLM prompt. Each candidate is listed with a stable index-free id so
 * the model can only reference real places. The instruction pins it to the pool
 * and to a short, second-person reason tailored to the traveller's context.
 */
export function buildRecommendPrompt(
  city: string,
  context: RecommendationContext,
  candidates: readonly Candidate[],
): string {
  const list = candidates
    .map(
      (c) =>
        `- id: ${c.placeId} | ${c.name} | ${c.kind}/${c.category}` +
        (c.rating ? ` | ${c.rating}★ (${c.userRatingCount ?? 0})` : ''),
    )
    .join('\n');

  const focus = context.interests
    ? 'The traveller asked for something specific — prioritise places that match' +
      ' their stated interests, and only include others if there are too few' +
      ' good matches.'
    : 'Favour a mix of food and activities.';

  return [
    `You are a travel concierge picking the best things to do in ${city}.`,
    '',
    'Traveller context:',
    describeContext(context),
    '',
    'Candidate places (choose ONLY from these — use the exact id):',
    list,
    '',
    `Pick up to ${RECOMMEND_LIMIT} that best fit the traveller. ${focus} For each` +
      ' pick, write a single short sentence (max 18 words) in the second person' +
      ' explaining why it suits THIS traveller. Order best-first. Return JSON.',
  ].join('\n');
}

interface GeminiPick {
  placeId: string;
  reason: string;
}

function isPick(value: unknown): value is GeminiPick {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.placeId === 'string' && typeof v.reason === 'string';
}

/**
 * Merges the model's picks back onto the grounded candidate pool: keeps model
 * order, drops any id not in the pool (anti-hallucination), attaches the reason,
 * and dedupes. Returns at most {@link RECOMMEND_LIMIT} recommendations.
 */
export function parseGeminiPicks(
  raw: unknown,
  candidates: readonly Candidate[],
): Recommendation[] {
  const byId = new Map(candidates.map((c) => [c.placeId, c]));
  const picks =
    typeof raw === 'object' && raw !== null
      ? (raw as { picks?: unknown }).picks
      : undefined;
  if (!Array.isArray(picks)) return [];

  const seen = new Set<string>();
  const result: Recommendation[] = [];
  for (const pick of picks) {
    if (!isPick(pick)) continue;
    const candidate = byId.get(pick.placeId);
    if (!candidate || seen.has(pick.placeId)) continue;
    seen.add(pick.placeId);
    result.push({ ...candidate, reason: pick.reason.trim() || undefined });
    if (result.length >= RECOMMEND_LIMIT) break;
  }
  return result;
}

/** Rule-based fallback: top candidates by popularity, no LLM reason. */
export function fallbackRecommendations(
  candidates: readonly Candidate[],
): Recommendation[] {
  return candidates.slice(0, RECOMMEND_LIMIT).map((c) => ({ ...c }));
}
