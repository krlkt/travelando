import { describe, expect, it } from 'vitest';
import { wishlistEntryToItemDraft } from './wishlistItemDraft';
import type { WishlistEntry } from './wishlistItems';

function entry(over: Partial<WishlistEntry>): WishlistEntry {
  return {
    id: 'w-1',
    kind: 'activity',
    tripId: 'trip-1',
    cityLabel: 'Tokyo',
    name: 'Senso-ji',
    address: '2-3-1 Asakusa',
    lat: 35.7148,
    lng: 139.7967,
    placeId: 'p-senso',
    ...over,
  };
}

describe('wishlistEntryToItemDraft', () => {
  it('maps an activity entry to an activity item with the place as `to`', () => {
    const draft = wishlistEntryToItemDraft(entry({}), {
      startsAt: '2026-06-01T10:00:00',
    });

    expect(draft).toEqual({
      kind: 'activity',
      title: 'Senso-ji',
      startsAt: '2026-06-01T10:00:00',
      endsAt: undefined,
      to: {
        label: 'Senso-ji',
        address: '2-3-1 Asakusa',
        lat: 35.7148,
        lng: 139.7967,
        placeId: 'p-senso',
      },
    });
  });

  it('maps a food entry to a meal item', () => {
    const draft = wishlistEntryToItemDraft(
      entry({ kind: 'food', name: 'Ichiran' }),
      { startsAt: '2026-06-01T12:00:00' },
    );

    expect(draft.kind).toBe('meal');
    expect(draft.title).toBe('Ichiran');
    expect(draft.to?.label).toBe('Ichiran');
  });

  it('carries an end time through when provided', () => {
    const draft = wishlistEntryToItemDraft(entry({}), {
      startsAt: '2026-06-01T10:00:00',
      endsAt: '2026-06-01T11:30:00',
    });

    expect(draft.endsAt).toBe('2026-06-01T11:30:00');
  });
});
