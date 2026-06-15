import { describe, expect, it } from 'vitest';
import { findCurrentItem, findNextItem } from './grouping';
import type { TripItem } from './types';

// Minimal TripItem factory — only the fields the current/next logic reads.
function item(
  partial: Partial<TripItem> & { id: string; startsAt: string },
): TripItem {
  return {
    kind: 'activity',
    title: partial.id,
    ...partial,
  } as TripItem;
}

// Itinerary times are floating wall-clock strings. parseNaive maps them onto the
// device clock, so we build `now` the same way: a local Date for that wall time.
const at = (wall: string): Date => {
  const [d, t = '00:00'] = wall.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh, mm);
};

describe('findCurrentItem', () => {
  it('returns the item whose window contains now', () => {
    const items = [
      item({
        id: 'a',
        startsAt: '2026-06-16T09:00',
        endsAt: '2026-06-16T10:00',
      }),
      item({
        id: 'b',
        startsAt: '2026-06-16T11:00',
        endsAt: '2026-06-16T12:00',
      }),
    ];
    expect(findCurrentItem(items, at('2026-06-16T09:30'))?.id).toBe('a');
  });

  it('returns null before the first item starts', () => {
    const items = [
      item({
        id: 'a',
        startsAt: '2026-06-16T09:00',
        endsAt: '2026-06-16T10:00',
      }),
    ];
    expect(findCurrentItem(items, at('2026-06-16T08:00'))).toBeNull();
  });

  it('returns null after the last item ends', () => {
    const items = [
      item({
        id: 'a',
        startsAt: '2026-06-16T09:00',
        endsAt: '2026-06-16T10:00',
      }),
    ];
    expect(findCurrentItem(items, at('2026-06-16T10:30'))).toBeNull();
  });

  it('keeps an open-ended item current until the next item begins', () => {
    const items = [
      item({ id: 'a', startsAt: '2026-06-16T09:00' }), // no endsAt
      item({
        id: 'b',
        startsAt: '2026-06-16T13:00',
        endsAt: '2026-06-16T14:00',
      }),
    ];
    // Two hours in, well past the old 1-hour fallback, still current.
    expect(findCurrentItem(items, at('2026-06-16T11:00'))?.id).toBe('a');
    // Once the next item begins, it takes over.
    expect(findCurrentItem(items, at('2026-06-16T13:30'))?.id).toBe('b');
  });

  it('falls back to a 1-hour window for a trailing open-ended item', () => {
    const items = [item({ id: 'a', startsAt: '2026-06-16T09:00' })];
    expect(findCurrentItem(items, at('2026-06-16T09:30'))?.id).toBe('a');
    expect(findCurrentItem(items, at('2026-06-16T10:30'))).toBeNull();
  });

  it('prefers the latest-starting item among overlaps', () => {
    const items = [
      item({
        id: 'long',
        startsAt: '2026-06-16T09:00',
        endsAt: '2026-06-16T18:00',
      }),
      item({
        id: 'short',
        startsAt: '2026-06-16T12:00',
        endsAt: '2026-06-16T13:00',
      }),
    ];
    expect(findCurrentItem(items, at('2026-06-16T12:30'))?.id).toBe('short');
  });

  it('detects the current item regardless of array order', () => {
    const items = [
      item({
        id: 'b',
        startsAt: '2026-06-16T11:00',
        endsAt: '2026-06-16T12:00',
      }),
      item({
        id: 'a',
        startsAt: '2026-06-16T09:00',
        endsAt: '2026-06-16T10:00',
      }),
    ];
    expect(findCurrentItem(items, at('2026-06-16T09:30'))?.id).toBe('a');
  });
});

describe('findNextItem', () => {
  it('returns the earliest item that starts after now', () => {
    const items = [
      item({ id: 'a', startsAt: '2026-06-16T09:00' }),
      item({ id: 'b', startsAt: '2026-06-16T11:00' }),
      item({ id: 'c', startsAt: '2026-06-16T15:00' }),
    ];
    expect(findNextItem(items, at('2026-06-16T10:00'))?.id).toBe('b');
  });

  it('returns null when nothing is upcoming', () => {
    const items = [item({ id: 'a', startsAt: '2026-06-16T09:00' })];
    expect(findNextItem(items, at('2026-06-16T10:00'))).toBeNull();
  });
});
