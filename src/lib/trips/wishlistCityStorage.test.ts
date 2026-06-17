import { describe, expect, it } from 'vitest';
import { buildWishlistCityKey, pickInitialCity } from './wishlistCityStorage';

describe('buildWishlistCityKey', () => {
  it('namespaces the key per trip', () => {
    expect(buildWishlistCityKey('trip-1')).toBe(
      'travelando:wishlistCity:trip-1',
    );
  });
});

describe('pickInitialCity', () => {
  const validKeys = ['ChIJtokyo', 'ChIJkyoto', 'Osaka'];

  it('restores a stored city when it is still valid', () => {
    // Arrange
    const stored = 'ChIJkyoto';

    // Act
    const result = pickInitialCity({
      stored,
      validKeys,
      fallback: 'ChIJtokyo',
    });

    // Assert
    expect(result).toBe('ChIJkyoto');
  });

  it('falls back to the first city when nothing is stored', () => {
    const result = pickInitialCity({
      stored: null,
      validKeys,
      fallback: 'ChIJtokyo',
    });

    expect(result).toBe('ChIJtokyo');
  });

  it('falls back when the stored city is no longer on the trip', () => {
    const result = pickInitialCity({
      stored: 'ChIJsapporo',
      validKeys,
      fallback: 'ChIJtokyo',
    });

    expect(result).toBe('ChIJtokyo');
  });

  it('falls back when the stored city is an empty string', () => {
    const result = pickInitialCity({
      stored: '',
      validKeys,
      fallback: 'ChIJtokyo',
    });

    expect(result).toBe('ChIJtokyo');
  });
});
