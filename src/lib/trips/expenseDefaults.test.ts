import { describe, expect, it } from 'vitest';
import {
  buildExpenseDefaultsKey,
  resolvePayerDefault,
  resolveSelectionDefault,
  type StoredExpenseDefaults,
} from './expenseDefaults';

describe('buildExpenseDefaultsKey', () => {
  it('namespaces the key per trip', () => {
    expect(buildExpenseDefaultsKey('trip-1')).toBe(
      'travelando:expenseDefaults:trip-1',
    );
  });
});

describe('resolvePayerDefault', () => {
  const memberIds = ['m1', 'm2', 'm3'];

  it('restores a stored payer when still a member', () => {
    // Arrange
    const stored: StoredExpenseDefaults = {
      payerMemberId: 'm2',
      selectedMemberIds: [],
    };

    // Act
    const result = resolvePayerDefault({ stored, memberIds, fallback: 'm1' });

    // Assert
    expect(result).toBe('m2');
  });

  it('falls back when the stored payer was retired', () => {
    const stored: StoredExpenseDefaults = {
      payerMemberId: 'gone',
      selectedMemberIds: [],
    };

    const result = resolvePayerDefault({ stored, memberIds, fallback: 'm1' });

    expect(result).toBe('m1');
  });

  it('falls back when nothing is stored', () => {
    const result = resolvePayerDefault({
      stored: null,
      memberIds,
      fallback: 'm1',
    });

    expect(result).toBe('m1');
  });
});

describe('resolveSelectionDefault', () => {
  const memberIds = ['m1', 'm2', 'm3'];

  it('restores the stored members that are still on the trip', () => {
    const stored: StoredExpenseDefaults = {
      payerMemberId: null,
      selectedMemberIds: ['m1', 'm3'],
    };

    const result = resolveSelectionDefault({ stored, memberIds });

    expect(result).toEqual(['m1', 'm3']);
  });

  it('drops retired members from the stored selection', () => {
    const stored: StoredExpenseDefaults = {
      payerMemberId: null,
      selectedMemberIds: ['m1', 'gone'],
    };

    const result = resolveSelectionDefault({ stored, memberIds });

    expect(result).toEqual(['m1']);
  });

  it('falls back to everyone when nothing is stored', () => {
    const result = resolveSelectionDefault({ stored: null, memberIds });

    expect(result).toEqual(['m1', 'm2', 'm3']);
  });

  it('falls back to everyone when all stored members were retired', () => {
    const stored: StoredExpenseDefaults = {
      payerMemberId: null,
      selectedMemberIds: ['gone-1', 'gone-2'],
    };

    const result = resolveSelectionDefault({ stored, memberIds });

    expect(result).toEqual(['m1', 'm2', 'm3']);
  });
});
