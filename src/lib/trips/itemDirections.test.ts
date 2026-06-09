import { describe, expect, test } from 'vitest';
import { directionsForItem } from './itemDirections';
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

describe('directionsForItem', () => {
  test('non-transport item routes to its place', () => {
    const item = makeItem({
      kind: 'activity',
      to: { label: 'Museum', lat: 35.7, lng: 139.7 },
    });
    const result = directionsForItem(item);
    expect(result?.kind).toBe('navigate');
    if (result?.kind === 'navigate') {
      expect(result.toLabel).toBe('Museum');
      // origin omitted → device location is used
      expect(result.url).not.toContain('origin=');
      expect(result.url).toContain('destination=35.7%2C139.7');
    }
  });

  test('transport item surfaces its own from → to route', () => {
    const item = makeItem({
      kind: 'transport',
      transportMode: 'train',
      fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
      toCity: { label: 'Kyoto', lat: 35.01, lng: 135.76 },
    });
    const result = directionsForItem(item);
    expect(result?.kind).toBe('route');
    if (result?.kind === 'route') {
      expect(result.fromLabel).toBe('Tokyo');
      expect(result.toLabel).toBe('Kyoto');
      expect(result.url).toContain('origin=35.68%2C139.76');
      expect(result.url).toContain('destination=35.01%2C135.76');
    }
  });

  test('transport prefers station waypoints over cities', () => {
    const item = makeItem({
      kind: 'transport',
      from: { label: 'Tokyo Station', lat: 35.68, lng: 139.76 },
      to: { label: 'Kyoto Station', lat: 35.0, lng: 135.76 },
      fromCity: { label: 'Tokyo' },
      toCity: { label: 'Kyoto' },
    });
    const result = directionsForItem(item);
    expect(result?.kind).toBe('route');
    if (result?.kind === 'route') {
      expect(result.fromLabel).toBe('Tokyo Station');
      expect(result.toLabel).toBe('Kyoto Station');
    }
  });

  test('returns null when a non-transport place is not routable', () => {
    const item = makeItem({ to: { label: 'Lunch' } });
    expect(directionsForItem(item)).toBeNull();
  });

  test('returns null for transport missing an endpoint', () => {
    const item = makeItem({
      kind: 'transport',
      fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
    });
    expect(directionsForItem(item)).toBeNull();
  });
});
