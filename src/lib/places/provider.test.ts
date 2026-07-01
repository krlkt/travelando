import { describe, expect, test } from 'vitest';
import { parseGoogleRichDetail } from './provider';

const BASE = {
  id: 'places/abc',
  displayName: { text: 'Sensō-ji' },
  formattedAddress: '2-3-1 Asakusa, Tokyo',
  location: { latitude: 35.71, longitude: 139.79 },
};

describe('parseGoogleRichDetail photos', () => {
  test('exposes every photo ref and mirrors the first into photoName', () => {
    const detail = parseGoogleRichDetail({
      ...BASE,
      photos: [
        { name: 'places/abc/photos/one' },
        { name: 'places/abc/photos/two' },
        { name: 'places/abc/photos/three' },
      ],
    });

    expect(detail?.photoNames).toEqual([
      'places/abc/photos/one',
      'places/abc/photos/two',
      'places/abc/photos/three',
    ]);
    expect(detail?.photoName).toBe('places/abc/photos/one');
  });

  test('drops entries without a name', () => {
    const detail = parseGoogleRichDetail({
      ...BASE,
      photos: [{ name: 'places/abc/photos/one' }, { widthPx: 400 }],
    });

    expect(detail?.photoNames).toEqual(['places/abc/photos/one']);
  });

  test('leaves both photo fields undefined when no photos are returned', () => {
    const detail = parseGoogleRichDetail({ ...BASE, photos: [] });

    expect(detail?.photoNames).toBeUndefined();
    expect(detail?.photoName).toBeUndefined();
  });

  test('returns null when the base detail is unparseable', () => {
    expect(parseGoogleRichDetail({ photos: [{ name: 'x' }] })).toBeNull();
  });
});
