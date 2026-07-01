import { describe, expect, it } from 'vitest';
import {
  buildSearchQueries,
  classifyPlace,
  parseTextSearchPlace,
  rankCandidates,
  scorePlace,
  type Candidate,
} from './discover';

describe('buildSearchQueries', () => {
  it('always includes a things-to-do and a food query', () => {
    const queries = buildSearchQueries('Kyoto', {});
    expect(queries).toHaveLength(2);
    expect(queries[0].query).toContain('things to do in Kyoto');
    expect(queries[1].query).toContain('eat in Kyoto');
  });

  it('folds companion bias into the broad queries', () => {
    const queries = buildSearchQueries('Kyoto', { companions: 'family' });
    expect(queries[0].query).toContain('family friendly');
  });

  it('searches interests directly (capped at 3) and drops the broad queries', () => {
    const queries = buildSearchQueries('Kyoto', {
      interests: 'ramen, temples, jazz bars, hiking, pottery',
    });
    // interests-only — no broad "attractions"/"eat" dilution
    expect(queries).toHaveLength(3);
    expect(queries[0].query).toBe('ramen in Kyoto');
    expect(queries.some((q) => q.query.includes('things to do'))).toBe(false);
  });

  it('folds companion bias into interest queries', () => {
    const queries = buildSearchQueries('Kyoto', {
      interests: 'ramen',
      companions: 'family',
    });
    expect(queries[0].query).toBe('family friendly ramen in Kyoto');
  });
});

describe('classifyPlace', () => {
  it('prefers primaryType', () => {
    expect(classifyPlace(['restaurant'], 'cafe')).toEqual({
      kind: 'food',
      category: 'cafe',
    });
  });

  it('falls back to types array when primaryType is unmapped', () => {
    expect(classifyPlace(['museum'], 'point_of_interest')).toEqual({
      kind: 'activity',
      category: 'museum',
    });
  });

  it('defaults unknown places to activity/sightseeing', () => {
    expect(classifyPlace([], undefined)).toEqual({
      kind: 'activity',
      category: 'sightseeing',
    });
  });
});

describe('scorePlace', () => {
  it('weights rating by log of review count', () => {
    const few = scorePlace(4.9, 30);
    const many = scorePlace(4.6, 12000);
    expect(many).toBeGreaterThan(few);
  });

  it('treats missing values as zero', () => {
    expect(scorePlace(undefined, undefined)).toBe(0);
  });
});

describe('rankCandidates', () => {
  const make = (id: string, rating: number, count: number): Candidate => ({
    placeId: id,
    name: id,
    rating,
    userRatingCount: count,
    kind: 'activity',
    category: 'sightseeing',
  });

  it('dedupes by placeId and sorts by popularity score', () => {
    const ranked = rankCandidates([
      make('a', 4.0, 10),
      make('b', 4.8, 5000),
      make('a', 4.0, 10),
    ]);
    expect(ranked.map((c) => c.placeId)).toEqual(['b', 'a']);
  });
});

describe('parseTextSearchPlace', () => {
  it('normalizes a Google place and classifies it', () => {
    const candidate = parseTextSearchPlace({
      id: 'p1',
      displayName: { text: 'Fushimi Inari' },
      formattedAddress: 'Kyoto',
      location: { latitude: 34.9, longitude: 135.7 },
      rating: 4.7,
      userRatingCount: 90000,
      types: ['tourist_attraction'],
      primaryType: 'tourist_attraction',
    });
    expect(candidate).toMatchObject({
      placeId: 'p1',
      name: 'Fushimi Inari',
      kind: 'activity',
      category: 'sightseeing',
      lat: 34.9,
    });
  });

  it('returns null without an id or name', () => {
    expect(parseTextSearchPlace({ displayName: { text: 'x' } })).toBeNull();
    expect(parseTextSearchPlace({ id: 'x' })).toBeNull();
  });
});
