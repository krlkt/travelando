import { describe, expect, it } from 'vitest';
import { dayScheduledItems } from './dayScheduledItems';
import { dayKey } from '@/lib/time/formatDate';
import type { Trip, TripItem } from './types';

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

const day1 = dayKey('2026-06-01T00:00:00');
const day2 = dayKey('2026-06-02T00:00:00');

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

describe('dayScheduledItems', () => {
  it('returns the day items in start-time order', () => {
    const trip = makeTrip([
      activity({
        id: 'a-2',
        title: 'Afternoon',
        startsAt: '2026-06-01T15:00:00',
      }),
      activity({
        id: 'a-1',
        title: 'Morning',
        startsAt: '2026-06-01T09:00:00',
      }),
      activity({ id: 'a-3', title: 'Midday', startsAt: '2026-06-01T12:00:00' }),
    ]);

    const items = dayScheduledItems(trip, day1);

    expect(items.map((i) => i.id)).toEqual(['a-1', 'a-3', 'a-2']);
  });

  it('only returns items for the requested day', () => {
    const trip = makeTrip([
      activity({ id: 'a-1', startsAt: '2026-06-01T10:00:00' }),
      activity({ id: 'a-2', startsAt: '2026-06-02T10:00:00' }),
    ]);

    expect(dayScheduledItems(trip, day1).map((i) => i.id)).toEqual(['a-1']);
    expect(dayScheduledItems(trip, day2).map((i) => i.id)).toEqual(['a-2']);
  });

  it('excludes lodging (anchors, not timeline stops)', () => {
    const trip = makeTrip([
      activity({ id: 'a-1', startsAt: '2026-06-01T10:00:00' }),
      activity({
        id: 'l-1',
        kind: 'lodging',
        title: 'Hotel',
        startsAt: '2026-06-01T16:00:00',
      }),
    ]);

    expect(dayScheduledItems(trip, day1).map((i) => i.id)).toEqual(['a-1']);
  });

  it('returns an empty array for a day with no items', () => {
    const trip = makeTrip([]);
    expect(dayScheduledItems(trip, day1)).toEqual([]);
  });
});
