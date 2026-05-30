import { describe, expect, it } from 'vitest';
import {
  routeHeadline,
  routeStations,
  transportEndpoints,
} from './transportRoute';
import type { TripItem } from './types';

const tripId = 'trip-1';

function transport(over: Partial<TripItem>): TripItem {
  return {
    id: 't-1',
    tripId,
    kind: 'transport',
    title: 'Shinkansen',
    startsAt: '2026-06-01T12:00:00',
    fromCity: { label: 'Tokyo' },
    toCity: { label: 'Kyoto' },
    from: { label: 'Tokyo Station' },
    to: { label: 'Kyoto Station' },
    ...over,
  };
}

describe('transportEndpoints', () => {
  it('returns null for non-transport items', () => {
    const item: TripItem = {
      id: 'a-1',
      tripId,
      kind: 'activity',
      title: 'Senso-ji',
      startsAt: '2026-06-01T10:00:00',
    };
    expect(transportEndpoints(item)).toBeNull();
  });

  it('prefers the station waypoint over the city', () => {
    expect(transportEndpoints(transport({}))).toEqual({
      from: { label: 'Tokyo Station' },
      to: { label: 'Kyoto Station' },
    });
  });

  it('falls back to the city per end when a station is missing', () => {
    expect(
      transportEndpoints(transport({ from: undefined, to: undefined })),
    ).toEqual({
      from: { label: 'Tokyo' },
      to: { label: 'Kyoto' },
    });
  });

  it('resolves each end independently', () => {
    expect(transportEndpoints(transport({ from: undefined }))).toEqual({
      from: { label: 'Tokyo' },
      to: { label: 'Kyoto Station' },
    });
  });
});

describe('routeHeadline', () => {
  it('uses the city pair for transport', () => {
    expect(routeHeadline(transport({}))).toEqual({
      from: { label: 'Tokyo' },
      to: { label: 'Kyoto' },
    });
  });
});

describe('routeStations', () => {
  it('returns the station pair for transport', () => {
    expect(routeStations(transport({}))).toEqual({
      from: { label: 'Tokyo Station' },
      to: { label: 'Kyoto Station' },
    });
  });

  it('returns null when no stations are set', () => {
    expect(
      routeStations(transport({ from: undefined, to: undefined })),
    ).toBeNull();
  });
});
