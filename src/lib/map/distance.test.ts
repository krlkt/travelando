import { describe, expect, it } from 'vitest';
import {
  formatDistance,
  haversineMeters,
  nearestDistanceMeters,
  walkMinutes,
} from './distance';

describe('haversineMeters', () => {
  it('is zero for identical points', () => {
    const p = { lat: 35.6595, lng: 139.7005 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('matches a known city-pair distance within tolerance', () => {
    // Tokyo Station -> Shinjuku Station is ~6.3 km as the crow flies.
    const tokyo = { lat: 35.681236, lng: 139.767125 };
    const shinjuku = { lat: 35.690921, lng: 139.700258 };
    const d = haversineMeters(tokyo, shinjuku);
    expect(d).toBeGreaterThan(6000);
    expect(d).toBeLessThan(6600);
  });

  it('is symmetric', () => {
    const a = { lat: 48.8584, lng: 2.2945 }; // Eiffel Tower
    const b = { lat: 48.8606, lng: 2.3376 }; // Louvre
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe('nearestDistanceMeters', () => {
  it('returns null when there are no targets', () => {
    expect(nearestDistanceMeters({ lat: 0, lng: 0 }, [])).toBeNull();
  });

  it('picks the closest target', () => {
    const point = { lat: 35.68, lng: 139.76 };
    const near = { lat: 35.681, lng: 139.761 };
    const far = { lat: 35.7, lng: 139.8 };
    const d = nearestDistanceMeters(point, [far, near]);
    expect(d).toBe(haversineMeters(point, near));
  });
});

describe('walkMinutes', () => {
  it('rounds to whole minutes at ~80 m/min', () => {
    expect(walkMinutes(480)).toBe(6);
  });

  it('never returns less than one minute', () => {
    expect(walkMinutes(10)).toBe(1);
  });
});

describe('formatDistance', () => {
  it('rounds metres to the nearest 10 under a kilometre', () => {
    expect(formatDistance(454)).toBe('~450 m');
  });

  it('switches to kilometres at or above 1 km', () => {
    expect(formatDistance(1234)).toBe('~1.2 km');
  });
});
