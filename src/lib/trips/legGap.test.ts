import { describe, expect, test } from 'vitest';
import { timelineLegGap, hotelLegGap } from './legGap';
import type { TripItem } from './types';

function makeItem(overrides: Partial<TripItem>): TripItem {
  return {
    id: 'i1',
    tripId: 't1',
    kind: 'activity',
    title: 'Stop',
    startsAt: '2026-06-08T10:00:00.000Z',
    ...overrides,
  };
}

describe('timelineLegGap', () => {
  test('offers directions and prefill between two routable, differing stops', () => {
    const prev = makeItem({
      to: { label: 'Museum', lat: 35.7, lng: 139.7 },
      startsAt: '2026-06-08T09:00:00.000Z',
      endsAt: '2026-06-08T10:00:00.000Z',
    });
    const next = makeItem({
      id: 'i2',
      to: { label: 'Cafe', lat: 35.71, lng: 139.72 },
      startsAt: '2026-06-08T11:00:00.000Z',
    });
    const leg = timelineLegGap(prev, next);
    expect(leg).not.toBeNull();
    expect(leg?.origin.label).toBe('Museum');
    expect(leg?.destination.label).toBe('Cafe');
    expect(leg?.directionsUrl).toContain('origin=35.7%2C139.7');
    expect(leg?.prefill).toEqual({
      kind: 'transport',
      from: prev.to,
      to: next.to,
      startsAt: '2026-06-08T10:00:00.000Z',
      endsAt: '2026-06-08T11:00:00.000Z',
    });
  });

  test('suppresses everything when both stops are the same place', () => {
    const prev = makeItem({ to: { label: 'Museum', lat: 35.7, lng: 139.7 } });
    const next = makeItem({
      id: 'i2',
      to: { label: 'Museum', lat: 35.7, lng: 139.7 },
    });
    expect(timelineLegGap(prev, next)).toBeNull();
  });

  test('drops prefill when a neighbour is already a transport item', () => {
    const prev = makeItem({
      kind: 'transport',
      from: { label: 'A', lat: 1, lng: 1 },
      to: { label: 'B', lat: 2, lng: 2 },
    });
    const next = makeItem({
      id: 'i2',
      to: { label: 'Cafe', lat: 3, lng: 3 },
    });
    const leg = timelineLegGap(prev, next);
    expect(leg?.prefill).toBeNull();
    expect(leg?.directionsUrl).toBeTruthy();
  });

  test('offers a label-only prefill even when the leg cannot be routed', () => {
    const prev = makeItem({ to: { label: 'Hotel lobby' } });
    const next = makeItem({ id: 'i2', to: { label: 'Old town square' } });
    const leg = timelineLegGap(prev, next);
    expect(leg?.directionsUrl).toBeNull();
    expect(leg?.prefill?.from.label).toBe('Hotel lobby');
    expect(leg?.prefill?.to.label).toBe('Old town square');
  });

  test('omits the end time when the next stop starts before the previous ends', () => {
    const prev = makeItem({
      to: { label: 'Museum', lat: 35.7, lng: 139.7 },
      startsAt: '2026-06-08T10:00:00.000Z',
      endsAt: '2026-06-08T12:00:00.000Z',
    });
    const next = makeItem({
      id: 'i2',
      to: { label: 'Cafe', lat: 35.71, lng: 139.72 },
      startsAt: '2026-06-08T11:00:00.000Z',
    });
    const leg = timelineLegGap(prev, next);
    expect(leg?.prefill?.startsAt).toBe('2026-06-08T12:00:00.000Z');
    expect(leg?.prefill?.endsAt).toBeUndefined();
  });
});

describe('hotelLegGap', () => {
  const lodging = makeItem({
    kind: 'lodging',
    to: { label: 'Casa do Príncipe', lat: 38.71, lng: -9.14 },
  });

  test('depart leg routes hotel → first stop with an arrival time', () => {
    const first = makeItem({
      id: 'i2',
      to: { label: 'Castle', lat: 38.7, lng: -9.13 },
      startsAt: '2026-06-08T09:30:00.000Z',
    });
    const leg = hotelLegGap(lodging, first, 'depart');
    expect(leg?.origin.label).toBe('Casa do Príncipe');
    expect(leg?.destination.label).toBe('Castle');
    expect(leg?.prefill?.endsAt).toBe('2026-06-08T09:30:00.000Z');
    expect(leg?.prefill?.startsAt).toBeUndefined();
  });

  test('arrive leg routes last stop → hotel with a departure time', () => {
    const last = makeItem({
      id: 'i2',
      to: { label: 'Bar', lat: 38.72, lng: -9.15 },
      startsAt: '2026-06-08T21:00:00.000Z',
      endsAt: '2026-06-08T23:00:00.000Z',
    });
    const leg = hotelLegGap(lodging, last, 'arrive');
    expect(leg?.origin.label).toBe('Bar');
    expect(leg?.destination.label).toBe('Casa do Príncipe');
    expect(leg?.prefill?.startsAt).toBe('2026-06-08T23:00:00.000Z');
    expect(leg?.prefill?.endsAt).toBeUndefined();
  });

  test('returns null when the stop is at the hotel itself', () => {
    const atHotel = makeItem({
      id: 'i2',
      to: { label: 'Casa do Príncipe', lat: 38.71, lng: -9.14 },
    });
    expect(hotelLegGap(lodging, atHotel, 'depart')).toBeNull();
  });
});
