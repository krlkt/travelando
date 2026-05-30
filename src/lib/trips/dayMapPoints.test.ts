import { describe, expect, it } from 'vitest';
import { buildDayMapPoints } from './dayMapPoints';
import { dayKey } from '@/lib/time/formatDate';
import type { ActivityPlace, FoodPlace, Trip, TripItem } from './types';

const tripId = 'trip-1';

function makeTrip(items: TripItem[]): Trip {
  return {
    id: tripId,
    title: 'Japan',
    destination: 'Tokyo',
    coverGradient: 'linear-gradient(#000,#111)',
    startDate: '2026-06-01T00:00:00',
    endDate: '2026-06-02T00:00:00',
    members: [],
    items,
  };
}

const day1 = dayKey('2026-06-01T09:00:00');

function activity(over: Partial<TripItem>): TripItem {
  return {
    id: 'a-1',
    tripId,
    kind: 'activity',
    title: 'Senso-ji',
    startsAt: '2026-06-01T10:00:00',
    to: { label: 'Senso-ji', lat: 35.7148, lng: 139.7967, placeId: 'p-senso' },
    ...over,
  };
}

describe('buildDayMapPoints', () => {
  it('plots scheduled items in time order', () => {
    const trip = makeTrip([
      activity({
        id: 'a-2',
        title: 'Afternoon',
        startsAt: '2026-06-01T15:00:00',
        to: { label: 'Shibuya', lat: 35.6595, lng: 139.7005 },
      }),
      activity({
        id: 'a-1',
        title: 'Morning',
        startsAt: '2026-06-01T09:00:00',
        to: { label: 'Asakusa', lat: 35.7148, lng: 139.7967 },
      }),
    ]);

    const { points } = buildDayMapPoints(trip, day1, [], []);
    const scheduled = points.filter((p) => p.kind === 'scheduled');

    expect(scheduled.map((p) => p.label)).toEqual(['Morning', 'Afternoon']);
    expect(scheduled.map((p) => p.kind === 'scheduled' && p.order)).toEqual([
      1, 2,
    ]);
  });

  it('counts items without coordinates as unlocated and skips them', () => {
    const trip = makeTrip([
      activity({ id: 'a-1', to: { label: 'Mystery cafe' } }),
    ]);

    const { points, unlocatedCount } = buildDayMapPoints(trip, day1, [], []);

    expect(points).toHaveLength(0);
    expect(unlocatedCount).toBe(1);
  });

  it('adds a lodging anchor distinct from scheduled items', () => {
    const trip = makeTrip([
      activity({}),
      {
        id: 'l-1',
        tripId,
        kind: 'lodging',
        title: 'Hotel Okura',
        startsAt: '2026-06-01T15:00:00',
        endsAt: '2026-06-02T11:00:00',
        to: { label: 'Hotel Okura', lat: 35.6671, lng: 139.7415 },
      },
    ]);

    const { points } = buildDayMapPoints(trip, day1, [], []);

    expect(points.filter((p) => p.kind === 'lodging')).toHaveLength(1);
    expect(points.filter((p) => p.kind === 'scheduled')).toHaveLength(1);
  });

  it('includes located wishlists for the day city and ranks nothing out', () => {
    const food: FoodPlace[] = [
      {
        id: 'f-1',
        tripId,
        cityLabel: 'Tokyo',
        name: 'Ramen Bar',
        lat: 35.69,
        lng: 139.7,
        wantLevel: 3,
      },
      {
        id: 'f-2',
        tripId,
        cityLabel: 'Tokyo',
        name: 'No-location izakaya',
      },
    ];
    const activities: ActivityPlace[] = [
      {
        id: 'ap-1',
        tripId,
        cityLabel: 'Tokyo',
        name: 'TeamLab',
        lat: 35.62,
        lng: 139.78,
      },
    ];

    const { points, unlocatedCount } = buildDayMapPoints(
      makeTrip([activity({})]),
      day1,
      food,
      activities,
    );

    expect(points.filter((p) => p.kind === 'foodWish')).toHaveLength(1);
    expect(points.filter((p) => p.kind === 'activityWish')).toHaveLength(1);
    expect(unlocatedCount).toBe(1); // the no-location izakaya
  });

  it('drops a wishlist pin already scheduled (same placeId)', () => {
    const food: FoodPlace[] = [
      {
        id: 'f-1',
        tripId,
        cityLabel: 'Tokyo',
        name: 'Senso-ji eats',
        lat: 35.7148,
        lng: 139.7967,
        placeId: 'p-senso',
      },
    ];

    const { points } = buildDayMapPoints(
      makeTrip([activity({})]), // scheduled item uses placeId 'p-senso'
      day1,
      food,
      [],
    );

    expect(points.filter((p) => p.kind === 'foodWish')).toHaveLength(0);
  });

  it('excludes wishlists from other cities', () => {
    const food: FoodPlace[] = [
      {
        id: 'f-1',
        tripId,
        cityLabel: 'Kyoto',
        name: 'Kyoto kaiseki',
        lat: 35.01,
        lng: 135.76,
      },
    ];

    const { points } = buildDayMapPoints(
      makeTrip([activity({})]),
      day1,
      food,
      [],
    );

    expect(points.filter((p) => p.kind === 'foodWish')).toHaveLength(0);
  });
});
