import { describe, expect, it } from 'vitest';
import { parseTimeInput, getTimePart, getDatePart } from './timeInput';

describe('parseTimeInput', () => {
  it('expands a bare hour to HH:00', () => {
    expect(parseTimeInput('9')).toBe('09:00');
    expect(parseTimeInput('14')).toBe('14:00');
  });

  it('parses 3-4 digit compact times', () => {
    expect(parseTimeInput('930')).toBe('09:30');
    expect(parseTimeInput('1345')).toBe('13:45');
  });

  it('parses separated times with various separators', () => {
    expect(parseTimeInput('9:30')).toBe('09:30');
    expect(parseTimeInput('9.30')).toBe('09:30');
    expect(parseTimeInput('9-05')).toBe('09:05');
  });

  it('trims surrounding whitespace', () => {
    expect(parseTimeInput('  9:30  ')).toBe('09:30');
  });

  it('returns null for empty input', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('   ')).toBeNull();
  });

  it('returns null for out-of-range values', () => {
    expect(parseTimeInput('25')).toBeNull();
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('9:60')).toBeNull();
  });

  it('returns null for non-numeric junk', () => {
    expect(parseTimeInput('noon')).toBeNull();
    expect(parseTimeInput('9am')).toBeNull();
  });
});

describe('getDatePart / getTimePart', () => {
  it('splits a local-input string', () => {
    expect(getDatePart('2026-06-01T09:30')).toBe('2026-06-01');
    expect(getTimePart('2026-06-01T09:30')).toBe('09:30');
  });

  it('handles missing time component', () => {
    expect(getDatePart('2026-06-01')).toBe('2026-06-01');
    expect(getTimePart('2026-06-01')).toBe('');
  });

  it('returns empty for empty input', () => {
    expect(getDatePart('')).toBe('');
    expect(getTimePart('')).toBe('');
  });
});
