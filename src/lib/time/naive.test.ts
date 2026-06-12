import { describe, expect, it } from 'vitest';
import { parseNaive, stripOffset, toNaiveString } from './naive';
import { formatTime, dayKey } from './formatDate';
import { toLocalInput, fromLocalInput } from './timeInput';

// These invariants must hold in *every* device timezone: run the suite with
// e.g. TZ=Europe/Berlin and TZ=Asia/Jakarta to prove itinerary times never
// shift with the viewer's location.

describe('stripOffset', () => {
  it('drops legacy UTC and offset suffixes', () => {
    expect(stripOffset('2026-06-12T09:00:00Z')).toBe('2026-06-12T09:00:00');
    expect(stripOffset('2026-06-12T09:00:00.000Z')).toBe('2026-06-12T09:00:00');
    expect(stripOffset('2026-06-12T09:00:00+02:00')).toBe(
      '2026-06-12T09:00:00',
    );
  });

  it('leaves floating values untouched', () => {
    expect(stripOffset('2026-06-12T09:00')).toBe('2026-06-12T09:00');
    expect(stripOffset('2026-06-12')).toBe('2026-06-12');
  });
});

describe('parseNaive', () => {
  it('reads the wall time as device-local', () => {
    const d = parseNaive('2026-06-12T09:30:15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(15);
  });

  it('puts date-only values at local midnight (not UTC midnight)', () => {
    const d = parseNaive('2026-06-12');
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(0);
  });

  it('orders mixed-precision values correctly', () => {
    const morning = parseNaive('2026-06-12T09:00');
    const evening = parseNaive('2026-06-12T23:30:00');
    expect(morning.getTime()).toBeLessThan(evening.getTime());
  });
});

describe('toNaiveString', () => {
  it('round-trips with parseNaive', () => {
    expect(toNaiveString(parseNaive('2026-06-12T09:05'))).toBe(
      '2026-06-12T09:05',
    );
  });
});

describe('timezone-stable rendering', () => {
  it('formats the typed wall time in any timezone', () => {
    expect(formatTime('2026-06-12T09:00:00')).toBe('09:00');
    expect(formatTime('2026-06-12T23:30')).toBe('23:30');
  });

  it('keeps a late-evening item on its typed day', () => {
    expect(dayKey('2026-06-12T23:30:00')).toBe('2026-06-12');
  });

  it('derives day keys from date-only trip dates without shifting', () => {
    expect(dayKey('2026-06-12')).toBe('2026-06-12');
  });
});

describe('input round-trip', () => {
  it('stores exactly what was typed', () => {
    expect(fromLocalInput('2026-06-12T09:00')).toBe('2026-06-12T09:00');
  });

  it('shows exactly what the database stores', () => {
    expect(toLocalInput('2026-06-12T09:00:00')).toBe('2026-06-12T09:00');
  });

  it('tolerates legacy ISO instants by reading their wall time', () => {
    expect(toLocalInput('2026-06-12T09:00:00Z')).toBe('2026-06-12T09:00');
  });
});
