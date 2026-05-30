import { describe, it, expect } from 'vitest';
import { deriveCitiesByDay, cityForDay } from './cities';
import { dayKey } from '@/lib/time/formatDate';
import type { Trip, TripItem } from './types';

function makeTrip(items: TripItem[]): Trip {
  return {
    id: 'trip-1',
    title: 'Test trip',
    destination: 'Amsterdam',
    coverGradient: 'linear-gradient(#000, #fff)',
    startDate: '2026-06-01',
    endDate: '2026-06-03',
    members: [],
    items,
  };
}

function transport(partial: Partial<TripItem>): TripItem {
  return {
    id: 'i-1',
    tripId: 'trip-1',
    kind: 'transport',
    title: 'Move',
    startsAt: '2026-06-02T09:00:00.000Z',
    endsAt: '2026-06-02T11:00:00.000Z',
    ...partial,
  };
}

describe('deriveCitiesByDay city pair', () => {
  it('switches the current city using toCity, not the routing stations', () => {
    const trip = makeTrip([
      transport({
        fromCity: { label: 'Amsterdam' },
        toCity: { label: 'Paris' },
        // Stations live in from/to and must NOT drive the city.
        from: { label: 'AMS Schiphol' },
        to: { label: 'Gare du Nord' },
      }),
    ]);

    const buckets = deriveCitiesByDay(trip, []);
    const arrivalKey = dayKey('2026-06-02T11:00:00.000Z');

    // The arrival day ends in Paris (the toCity), not "Gare du Nord".
    expect(cityForDay(trip, [], arrivalKey).cityLabel).toBe('Paris');

    // A later day carries Paris forward.
    const lastKey = dayKey('2026-06-03T00:00:00.000Z');
    expect(cityForDay(trip, [], lastKey).cityLabel).toBe('Paris');

    // First day (before the transport) stays at the destination.
    const firstKey = dayKey('2026-06-01T00:00:00.000Z');
    expect(cityForDay(trip, [], firstKey).cityLabel).toBe('Amsterdam');

    expect(buckets.size).toBe(3);
  });

  it('ignores a transport with stations but no toCity for segmentation', () => {
    const trip = makeTrip([
      transport({
        // No fromCity/toCity — purely a local hop with routing waypoints.
        from: { label: 'Rossio Station' },
        to: { label: 'Cais do Sodré' },
      }),
    ]);

    const arrivalKey = dayKey('2026-06-02T11:00:00.000Z');
    // City stays the trip destination; the hop doesn't change cities.
    expect(cityForDay(trip, [], arrivalKey).cityLabel).toBe('Amsterdam');
  });
});
