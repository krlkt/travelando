import { describe, expect, test } from 'vitest';
import { isPlaceInTimeline } from './wishlistStatus';
import type { TripItem } from './types';

function makeItem(overrides: Partial<TripItem>): TripItem {
  return {
    id: 'i1',
    tripId: 't1',
    kind: 'meal',
    title: 'Lunch',
    startsAt: '2026-06-08T12:00:00.000Z',
    ...overrides,
  };
}

describe('isPlaceInTimeline', () => {
  test('matches by Google place id', () => {
    const place = { placeId: 'abc', name: 'Tsuta' };
    const items = [makeItem({ to: { label: 'Lunch', placeId: 'abc' } })];
    expect(isPlaceInTimeline(place, items)).toBe(true);
  });

  test('matches by coordinates within the radius', () => {
    const place = { lat: 35.6812, lng: 139.7671, name: 'Ramen Nagi' };
    const items = [
      makeItem({ from: { label: 'Dinner', lat: 35.6813, lng: 139.7672 } }),
    ];
    expect(isPlaceInTimeline(place, items)).toBe(true);
  });

  test('does not match far-apart coordinates', () => {
    const place = { lat: 35.6812, lng: 139.7671, name: 'Ramen Nagi' };
    const items = [
      makeItem({ to: { label: 'Dinner', lat: 35.7, lng: 139.9 } }),
    ];
    expect(isPlaceInTimeline(place, items)).toBe(false);
  });

  test('matches by normalized name when ids and coords are absent', () => {
    const place = { name: 'Café  Rémidi' };
    const items = [makeItem({ to: { label: 'cafe remidi' } })];
    // diacritics + spacing differ but normalize equal
    expect(isPlaceInTimeline(place, items)).toBe(true);
  });

  test('returns false when nothing matches', () => {
    const place = { placeId: 'abc', name: 'Tsuta' };
    const items = [
      makeItem({ to: { label: 'Somewhere else', placeId: 'xyz' } }),
    ];
    expect(isPlaceInTimeline(place, items)).toBe(false);
  });

  test('ignores transport city fields', () => {
    const place = { name: 'Tokyo' };
    const items = [
      makeItem({
        kind: 'transport',
        fromCity: { label: 'Tokyo' },
        toCity: { label: 'Osaka' },
      }),
    ];
    expect(isPlaceInTimeline(place, items)).toBe(false);
  });
});
