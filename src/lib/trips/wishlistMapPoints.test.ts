import { describe, expect, it } from 'vitest';
import { buildWishlistMapPoints } from './wishlistMapPoints';
import type { WishlistEntry } from './wishlistItems';

const entry = (over: Partial<WishlistEntry>): WishlistEntry => ({
  id: 'x',
  kind: 'activity',
  tripId: 't',
  cityLabel: 'Lisbon',
  name: 'Place',
  lat: 38.7,
  lng: -9.1,
  ...over,
});

describe('buildWishlistMapPoints', () => {
  it('maps food and activity entries to their wish point kinds', () => {
    const { points } = buildWishlistMapPoints([
      entry({ id: 'f', kind: 'food', name: 'Bakery' }),
      entry({ id: 'a', kind: 'activity', name: 'Museum' }),
    ]);

    expect(points.map((p) => p.kind)).toEqual(['foodWish', 'activityWish']);
    expect(points[0]).toMatchObject({
      id: 'food-f',
      placeRefId: 'f',
      label: 'Bakery',
    });
  });

  it('drops entries without coordinates and counts them', () => {
    const { points, unlocatedCount } = buildWishlistMapPoints([
      entry({ id: 'located' }),
      entry({ id: 'nolat', lat: undefined }),
      entry({ id: 'nan', lat: Number.NaN }),
    ]);

    expect(points).toHaveLength(1);
    expect(points[0].placeRefId).toBe('located');
    expect(unlocatedCount).toBe(2);
  });

  it('flags entries already in the plan via plannedIds', () => {
    const { points } = buildWishlistMapPoints(
      [entry({ id: 'a' }), entry({ id: 'b' })],
      new Set(['a']),
    );

    expect(points.find((p) => p.placeRefId === 'a')?.inPlan).toBe(true);
    expect(points.find((p) => p.placeRefId === 'b')?.inPlan).toBe(false);
  });

  it('carries want level and category through', () => {
    const { points } = buildWishlistMapPoints([
      entry({ id: 'f', kind: 'food', wantLevel: 4, category: 'cafe' }),
    ]);

    expect(points[0]).toMatchObject({ wantLevel: 4, category: 'cafe' });
  });
});
