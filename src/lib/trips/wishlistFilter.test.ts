import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WISHLIST_FILTER,
  availableWishCategories,
  filterDayMapPoints,
  type WishlistFilter,
} from './wishlistFilter';
import type { DayMapPoint } from './dayMapPoints';

function foodWish(over: Partial<DayMapPoint> = {}): DayMapPoint {
  return {
    kind: 'foodWish',
    id: 'food-1',
    placeRefId: 'fp-1',
    lat: 35.7,
    lng: 139.7,
    label: 'Ramen',
    category: 'restaurant',
    ...over,
  } as DayMapPoint;
}

function activityWish(over: Partial<DayMapPoint> = {}): DayMapPoint {
  return {
    kind: 'activityWish',
    id: 'activity-1',
    placeRefId: 'ap-1',
    lat: 35.7,
    lng: 139.8,
    label: 'Senso-ji',
    category: 'sightseeing',
    ...over,
  } as DayMapPoint;
}

const scheduled: DayMapPoint = {
  kind: 'scheduled',
  id: 'scheduled-1',
  itemId: 'i-1',
  itemKind: 'activity',
  order: 1,
  startsAt: '2026-06-01T10:00:00',
  lat: 35.71,
  lng: 139.79,
  label: 'Plan stop',
};

const lodging: DayMapPoint = {
  kind: 'lodging',
  id: 'lodging-1',
  itemId: 'i-2',
  order: 0,
  lat: 35.69,
  lng: 139.76,
  label: 'Hotel',
};

describe('filterDayMapPoints', () => {
  it('keeps all points under the default (all) filter', () => {
    // Arrange
    const points = [scheduled, lodging, foodWish(), activityWish()];

    // Act
    const visible = filterDayMapPoints(points, DEFAULT_WISHLIST_FILTER);

    // Assert
    expect(visible).toHaveLength(4);
  });

  it('always keeps scheduled and lodging points regardless of kind', () => {
    // Arrange
    const filter: WishlistFilter = {
      ...DEFAULT_WISHLIST_FILTER,
      kind: 'none',
    };

    // Act
    const visible = filterDayMapPoints(
      [scheduled, lodging, foodWish(), activityWish()],
      filter,
    );

    // Assert
    expect(visible.map((p) => p.kind)).toEqual(['scheduled', 'lodging']);
  });

  it('shows only food wishes when kind is food', () => {
    // Arrange
    const filter: WishlistFilter = {
      ...DEFAULT_WISHLIST_FILTER,
      kind: 'food',
    };

    // Act
    const visible = filterDayMapPoints([foodWish(), activityWish()], filter);

    // Assert
    expect(visible.map((p) => p.kind)).toEqual(['foodWish']);
  });

  it('shows only activity wishes when kind is activity', () => {
    // Arrange
    const filter: WishlistFilter = {
      ...DEFAULT_WISHLIST_FILTER,
      kind: 'activity',
    };

    // Act
    const visible = filterDayMapPoints([foodWish(), activityWish()], filter);

    // Assert
    expect(visible.map((p) => p.kind)).toEqual(['activityWish']);
  });

  it('refines food wishes by category set', () => {
    // Arrange
    const points = [
      foodWish({ id: 'food-r', category: 'restaurant' }),
      foodWish({ id: 'food-b', category: 'bar' }),
      foodWish({ id: 'food-c', category: 'cafe' }),
    ];
    const filter: WishlistFilter = {
      kind: 'food',
      foodCategories: new Set(['bar']),
      activityCategories: null,
    };

    // Act
    const visible = filterDayMapPoints(points, filter);

    // Assert
    expect(visible.map((p) => p.id)).toEqual(['food-b']);
  });

  it('treats an undefined category as "other"', () => {
    // Arrange
    const points = [foodWish({ id: 'food-x', category: undefined })];
    const filter: WishlistFilter = {
      kind: 'food',
      foodCategories: new Set(['other']),
      activityCategories: null,
    };

    // Act
    const visible = filterDayMapPoints(points, filter);

    // Assert
    expect(visible.map((p) => p.id)).toEqual(['food-x']);
  });

  it('hides every food category when the set is empty', () => {
    // Arrange
    const filter: WishlistFilter = {
      kind: 'food',
      foodCategories: new Set(),
      activityCategories: null,
    };

    // Act
    const visible = filterDayMapPoints([foodWish()], filter);

    // Assert
    expect(visible).toHaveLength(0);
  });
});

describe('availableWishCategories', () => {
  it('counts categories present per type and ignores non-wish points', () => {
    // Arrange
    const points = [
      scheduled,
      foodWish({ id: 'food-r1', category: 'restaurant' }),
      foodWish({ id: 'food-r2', category: 'restaurant' }),
      foodWish({ id: 'food-b', category: 'bar' }),
      activityWish({ id: 'act-s', category: 'sightseeing' }),
    ];

    // Act
    const result = availableWishCategories(points);

    // Assert
    expect(result.food).toEqual([
      { value: 'restaurant', count: 2 },
      { value: 'bar', count: 1 },
    ]);
    expect(result.activity).toEqual([{ value: 'sightseeing', count: 1 }]);
    expect(result.foodTotal).toBe(3);
    expect(result.activityTotal).toBe(1);
  });

  it('returns empty groups when there are no wishlist points', () => {
    // Act
    const result = availableWishCategories([scheduled, lodging]);

    // Assert
    expect(result.food).toEqual([]);
    expect(result.activity).toEqual([]);
    expect(result.foodTotal).toBe(0);
    expect(result.activityTotal).toBe(0);
  });
});
