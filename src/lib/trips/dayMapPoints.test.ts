import { describe, expect, it } from 'vitest';
import { buildDayMapPoints, type DayMapPoint } from './dayMapPoints';
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

function transport(over: Partial<TripItem>): TripItem {
  return {
    id: 't-1',
    tripId,
    kind: 'transport',
    title: 'Shinkansen',
    startsAt: '2026-06-01T12:00:00',
    fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
    toCity: { label: 'Kyoto', lat: 35.01, lng: 135.76 },
    from: {
      label: 'Tokyo Station',
      lat: 35.681,
      lng: 139.767,
      placeId: 'p-tok',
    },
    to: { label: 'Kyoto Station', lat: 34.985, lng: 135.758, placeId: 'p-kyo' },
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

  it('pins a transport leg at both depart and arrive (stations preferred)', () => {
    const { points } = buildDayMapPoints(
      makeTrip([transport({})]),
      day1,
      [],
      [],
    );
    const scheduled = points.filter(
      (p): p is Extract<DayMapPoint, { kind: 'scheduled' }> =>
        p.kind === 'scheduled',
    );

    expect(scheduled.map((p) => p.endpoint)).toEqual(['depart', 'arrive']);
    expect(scheduled.map((p) => p.order)).toEqual([1, 2]);
    expect(scheduled.map((p) => p.label)).toEqual([
      'Tokyo Station',
      'Kyoto Station',
    ]);
    expect(scheduled.map((p) => [p.lng, p.lat])).toEqual([
      [139.767, 35.681],
      [135.758, 34.985],
    ]);
  });

  it('falls back to the city when a transport station is missing', () => {
    const { points } = buildDayMapPoints(
      makeTrip([transport({ from: undefined })]),
      day1,
      [],
      [],
    );
    const scheduled = points.filter((p) => p.kind === 'scheduled');

    expect(scheduled.map((p) => p.label)).toEqual(['Tokyo', 'Kyoto Station']);
  });

  it('renders a single stop when only one transport end is locatable', () => {
    const { points, unlocatedCount } = buildDayMapPoints(
      makeTrip([transport({ from: undefined, fromCity: undefined })]),
      day1,
      [],
      [],
    );
    const scheduled = points.filter(
      (p): p is Extract<DayMapPoint, { kind: 'scheduled' }> =>
        p.kind === 'scheduled',
    );

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].endpoint).toBeUndefined();
    // Single-pin fallback keeps the leg title, matching legacy behaviour.
    expect(scheduled[0].label).toBe('Shinkansen');
    expect(scheduled[0].lng).toBe(135.758);
    expect(unlocatedCount).toBe(0);
  });

  it('counts a transport leg with no locatable end as unlocated', () => {
    const { points, unlocatedCount } = buildDayMapPoints(
      makeTrip([
        transport({
          from: undefined,
          to: undefined,
          fromCity: undefined,
          toCity: undefined,
        }),
      ]),
      day1,
      [],
      [],
    );

    expect(points.filter((p) => p.kind === 'scheduled')).toHaveLength(0);
    expect(unlocatedCount).toBe(1);
  });

  it('sequences transport endpoints among neighbouring stops', () => {
    const { points } = buildDayMapPoints(
      makeTrip([
        activity({ id: 'a-1', startsAt: '2026-06-01T09:00:00' }),
        transport({ startsAt: '2026-06-01T12:00:00' }),
      ]),
      day1,
      [],
      [],
    );
    const scheduled = points.filter(
      (p): p is Extract<DayMapPoint, { kind: 'scheduled' }> =>
        p.kind === 'scheduled',
    );

    expect(scheduled.map((p) => p.order)).toEqual([1, 2, 3]);
    expect(scheduled.map((p) => p.endpoint)).toEqual([
      undefined,
      'depart',
      'arrive',
    ]);
  });

  it('skips transport depart when it matches the previous day lodging location', () => {
    const hotelPlace = {
      label: 'Hotel',
      lat: 35.6671,
      lng: 139.7415,
      placeId: 'p-hotel',
    };
    const trip = makeTrip([
      // Prev-day lodging at the hotel
      {
        id: 'l-prev',
        tripId,
        kind: 'lodging',
        title: 'Hotel',
        startsAt: '2026-05-31T15:00:00',
        endsAt: '2026-06-01T11:00:00',
        to: hotelPlace,
      },
      // Transport departing from the same hotel
      transport({
        from: hotelPlace,
        fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
        toCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
        to: {
          label: 'Narita Airport',
          lat: 35.7647,
          lng: 140.3864,
          placeId: 'p-narita',
        },
      }),
    ]);

    const { points } = buildDayMapPoints(trip, day1, [], []);
    const scheduled = points.filter((p) => p.kind === 'scheduled');

    // Hotel depart is at the same location as the lodging icon — only the
    // airport arrive should be numbered.
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].label).toBe('Narita Airport');
    expect(scheduled[0].order).toBe(1);
  });

  it('deduplicates chained transport legs that share a layover location', () => {
    const airport = {
      label: 'Narita Airport',
      lat: 35.7647,
      lng: 140.3864,
      placeId: 'p-narita',
    };
    const trip = makeTrip([
      transport({
        id: 't-1',
        startsAt: '2026-06-01T08:00:00',
        from: {
          label: 'Hotel',
          lat: 35.6671,
          lng: 139.7415,
          placeId: 'p-hotel',
        },
        to: airport,
        fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
        toCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
      }),
      transport({
        id: 't-2',
        startsAt: '2026-06-01T13:00:00',
        from: airport,
        to: {
          label: 'Osaka Station',
          lat: 34.7024,
          lng: 135.4937,
          placeId: 'p-osaka',
        },
        fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
        toCity: { label: 'Osaka', lat: 34.69, lng: 135.5 },
      }),
    ]);

    const { points } = buildDayMapPoints(trip, day1, [], []);
    const scheduled = points.filter((p) => p.kind === 'scheduled');

    // T1.arrive (Narita) and T2.depart (Narita) are the same place — should
    // produce 3 pins, not 4.
    expect(scheduled.map((p) => p.label)).toEqual([
      'Hotel',
      'Narita Airport',
      'Osaka Station',
    ]);
    expect(scheduled.map((p) => p.order)).toEqual([1, 2, 3]);
  });

  it('user scenario: lodging → airport → city shows 2 numbered stops', () => {
    const hotelPlace = {
      label: 'Checked-out Hotel',
      lat: 35.6671,
      lng: 139.7415,
      placeId: 'p-hotel',
    };
    const airportPlace = {
      label: 'Airport',
      lat: 35.7647,
      lng: 140.3864,
      placeId: 'p-airport',
    };
    const trip = makeTrip([
      {
        id: 'l-prev',
        tripId,
        kind: 'lodging',
        title: 'Checked-out Hotel',
        startsAt: '2026-05-31T15:00:00',
        endsAt: '2026-06-01T11:00:00',
        to: hotelPlace,
      },
      transport({
        id: 't-1',
        title: 'Car to airport',
        startsAt: '2026-06-01T08:00:00',
        from: hotelPlace,
        to: airportPlace,
        fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
        toCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
      }),
      transport({
        id: 't-2',
        title: 'Flight to Osaka',
        startsAt: '2026-06-01T12:00:00',
        from: airportPlace,
        to: { label: 'Osaka', lat: 34.6937, lng: 135.5022, placeId: 'p-osaka' },
        fromCity: { label: 'Tokyo', lat: 35.68, lng: 139.76 },
        toCity: { label: 'Osaka', lat: 34.69, lng: 135.5 },
      }),
    ]);

    const { points } = buildDayMapPoints(trip, day1, [], []);
    const scheduled = points.filter((p) => p.kind === 'scheduled');
    const lodgingPins = points.filter((p) => p.kind === 'lodging');

    expect(scheduled.map((p) => p.order)).toEqual([1, 2]);
    expect(scheduled.map((p) => p.label)).toEqual(['Airport', 'Osaka']);
    // The lodging icon is still present as the route anchor (order 0)
    expect(lodgingPins).toHaveLength(1);
    expect(lodgingPins[0].order).toBe(0);
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
