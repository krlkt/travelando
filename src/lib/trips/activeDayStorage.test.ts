import { describe, expect, it } from 'vitest';
import { buildActiveDayKey, pickInitialDay } from './activeDayStorage';

describe('buildActiveDayKey', () => {
  it('namespaces the key per trip', () => {
    expect(buildActiveDayKey('trip-1')).toBe('travelando:activeDay:trip-1');
  });
});

describe('pickInitialDay', () => {
  const validKeys = ['2026-05-28', '2026-05-29', '2026-05-30'];

  it('restores a stored day when it is still valid', () => {
    // Arrange
    const stored = '2026-05-30';

    // Act
    const result = pickInitialDay({
      stored,
      validKeys,
      fallback: '2026-05-28',
    });

    // Assert
    expect(result).toBe('2026-05-30');
  });

  it('falls back when nothing is stored', () => {
    const result = pickInitialDay({
      stored: null,
      validKeys,
      fallback: '2026-05-28',
    });

    expect(result).toBe('2026-05-28');
  });

  it('falls back when the stored day is no longer valid', () => {
    const result = pickInitialDay({
      stored: '2026-06-15',
      validKeys,
      fallback: '2026-05-28',
    });

    expect(result).toBe('2026-05-28');
  });

  it('falls back when the stored day is an empty string', () => {
    const result = pickInitialDay({
      stored: '',
      validKeys,
      fallback: '2026-05-28',
    });

    expect(result).toBe('2026-05-28');
  });
});
