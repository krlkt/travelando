import { describe, expect, test } from 'vitest';
import { buildDirectionsUrl, canRouteBetween } from './maps-link';

describe('canRouteBetween', () => {
  test('true when both ends have coordinates', () => {
    const a = { label: 'A', lat: 35.68, lng: 139.76 };
    const b = { label: 'B', lat: 34.69, lng: 135.5 };
    expect(canRouteBetween(a, b)).toBe(true);
  });

  test('true when ends resolve via address or place id', () => {
    const a = { label: 'Hotel', address: '1-1 Marunouchi, Tokyo' };
    const b = { label: 'Museum', placeId: 'xyz' };
    expect(canRouteBetween(a, b)).toBe(true);
  });

  test('false when an end has only a label', () => {
    const a = { label: 'Lunch' };
    const b = { label: 'Museum', lat: 35.7, lng: 139.7 };
    expect(canRouteBetween(a, b)).toBe(false);
  });
});

describe('buildDirectionsUrl', () => {
  test('uses lat,lng tokens when available', () => {
    const url = buildDirectionsUrl(
      { label: 'A', lat: 35.68, lng: 139.76 },
      { label: 'B', lat: 34.69, lng: 135.5 },
    );
    expect(url).toContain('https://www.google.com/maps/dir/?');
    expect(url).toContain('origin=35.68%2C139.76');
    expect(url).toContain('destination=34.69%2C135.5');
    expect(url).toContain('api=1');
  });

  test('attaches place ids when present', () => {
    const url = buildDirectionsUrl(
      { label: 'A', lat: 1, lng: 2, placeId: 'orig' },
      { label: 'B', address: '5th Ave', placeId: 'dest' },
    );
    expect(url).toContain('origin_place_id=orig');
    expect(url).toContain('destination_place_id=dest');
    expect(url).toContain('destination=5th+Ave');
  });

  test('falls back to address then label tokens', () => {
    const url = buildDirectionsUrl(
      { label: 'Hotel', address: '1-1 Marunouchi' },
      { label: 'Some Cafe' },
    );
    expect(url).toContain('origin=1-1+Marunouchi');
    expect(url).toContain('destination=Some+Cafe');
  });

  test('returns null when an end has no usable token', () => {
    const url = buildDirectionsUrl(
      { label: '' },
      { label: 'B', lat: 1, lng: 2 },
    );
    expect(url).toBeNull();
  });
});
