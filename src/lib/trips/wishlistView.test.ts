import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WISHLIST_VIEW,
  filterAndSortWishlist,
  entryCityKey,
  type WishlistViewOptions,
} from './wishlistView';
import type { WishlistEntry } from './wishlistItems';

const entry = (over: Partial<WishlistEntry>): WishlistEntry => ({
  id: 'x',
  kind: 'activity',
  tripId: 't',
  cityLabel: 'Lisbon',
  name: 'Place',
  ...over,
});

const opts = (over: Partial<WishlistViewOptions>): WishlistViewOptions => ({
  ...DEFAULT_WISHLIST_VIEW,
  plannedIds: new Set(),
  ratingById: new Map(),
  ...over,
});

describe('entryCityKey', () => {
  it('prefers the place id over the label', () => {
    expect(entryCityKey(entry({ cityPlaceId: 'pid', cityLabel: 'L' }))).toBe(
      'pid',
    );
    expect(entryCityKey(entry({ cityLabel: 'L' }))).toBe('L');
  });
});

describe('filterAndSortWishlist', () => {
  const food = entry({ id: 'f', kind: 'food', name: 'Bakery', wantLevel: 2 });
  const museum = entry({
    id: 'm',
    kind: 'activity',
    name: 'Museum',
    wantLevel: 5,
  });
  const park = entry({ id: 'p', kind: 'activity', name: 'Park', wantLevel: 3 });

  it('filters by kind', () => {
    const out = filterAndSortWishlist(
      [food, museum, park],
      opts({ kind: 'food' }),
    );
    expect(out.map((e) => e.id)).toEqual(['f']);
  });

  it('filters by minimum want level', () => {
    const out = filterAndSortWishlist(
      [food, museum, park],
      opts({ minWantLevel: 3 }),
    );
    expect(out.map((e) => e.id).sort()).toEqual(['m', 'p']);
  });

  it('filters by plan status', () => {
    const planned = opts({ planFilter: 'planned', plannedIds: new Set(['m']) });
    expect(
      filterAndSortWishlist([food, museum, park], planned).map((e) => e.id),
    ).toEqual(['m']);

    const unplanned = opts({
      planFilter: 'unplanned',
      plannedIds: new Set(['m']),
    });
    expect(
      filterAndSortWishlist([food, museum, park], unplanned)
        .map((e) => e.id)
        .sort(),
    ).toEqual(['f', 'p']);
  });

  it('sorts by want level desc by default, name as tiebreak', () => {
    const out = filterAndSortWishlist([food, museum, park], opts({}));
    expect(out.map((e) => e.id)).toEqual(['m', 'p', 'f']);
  });

  it('sorts by rating when ratings are provided', () => {
    const ratingById = new Map([
      ['f', 4.8],
      ['m', 4.1],
      ['p', 4.5],
    ]);
    const out = filterAndSortWishlist(
      [food, museum, park],
      opts({ sort: 'rating', ratingById }),
    );
    expect(out.map((e) => e.id)).toEqual(['f', 'p', 'm']);
  });

  it('treats an empty category set as hiding everything', () => {
    const out = filterAndSortWishlist(
      [food, museum, park],
      opts({ categories: new Set() }),
    );
    expect(out).toEqual([]);
  });
});
