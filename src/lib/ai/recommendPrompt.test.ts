import { describe, expect, it } from 'vitest';
import type { Candidate } from '@/lib/places/discover';
import {
  buildRecommendPrompt,
  fallbackRecommendations,
  parseGeminiPicks,
} from './recommendPrompt';

const candidates: Candidate[] = [
  {
    placeId: 'a',
    name: 'Temple',
    kind: 'activity',
    category: 'sightseeing',
    rating: 4.7,
    userRatingCount: 100,
  },
  {
    placeId: 'b',
    name: 'Ramen Bar',
    kind: 'food',
    category: 'restaurant',
    rating: 4.5,
    userRatingCount: 50,
  },
];

describe('buildRecommendPrompt', () => {
  it('lists candidate ids and the traveller context', () => {
    const prompt = buildRecommendPrompt(
      'Kyoto',
      { companions: 'family' },
      candidates,
    );
    expect(prompt).toContain('id: a');
    expect(prompt).toContain('Travelling with: family');
    expect(prompt).toContain('Kyoto');
  });

  it('notes when no preferences are given', () => {
    const prompt = buildRecommendPrompt('Kyoto', {}, candidates);
    expect(prompt).toContain('No preferences given');
  });
});

describe('parseGeminiPicks', () => {
  it('merges reasons onto candidates in model order', () => {
    const result = parseGeminiPicks(
      { picks: [{ placeId: 'b', reason: 'Great for kids.' }] },
      candidates,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      placeId: 'b',
      reason: 'Great for kids.',
    });
  });

  it('drops hallucinated ids not in the pool', () => {
    const result = parseGeminiPicks(
      {
        picks: [
          { placeId: 'ghost', reason: 'x' },
          { placeId: 'a', reason: 'y' },
        ],
      },
      candidates,
    );
    expect(result.map((r) => r.placeId)).toEqual(['a']);
  });

  it('dedupes repeated ids', () => {
    const result = parseGeminiPicks(
      {
        picks: [
          { placeId: 'a', reason: '1' },
          { placeId: 'a', reason: '2' },
        ],
      },
      candidates,
    );
    expect(result).toHaveLength(1);
  });

  it('returns empty for malformed input', () => {
    expect(parseGeminiPicks(null, candidates)).toEqual([]);
    expect(parseGeminiPicks({ picks: 'nope' }, candidates)).toEqual([]);
  });
});

describe('fallbackRecommendations', () => {
  it('returns candidates with no reason attached', () => {
    const result = fallbackRecommendations(candidates);
    expect(result).toHaveLength(2);
    expect(result[0].reason).toBeUndefined();
  });
});
