import { describe, expect, it } from 'vitest';
import { createInMemoryRepository } from './inMemoryRepository';
import type { Trip, TripMember } from './types';

function member(overrides: Partial<TripMember> & { id: string }): TripMember {
  return {
    tripId: 'trip-1',
    displayName: 'Member',
    status: 'accepted',
    ...overrides,
  };
}

function seedTrip(): Trip {
  return {
    id: 'trip-1',
    title: 'Lisbon',
    destination: 'Portugal',
    coverGradient: 'linear-gradient(#fff,#000)',
    startDate: '2026-07-01',
    endDate: '2026-07-08',
    ownerId: 'owner-1',
    members: [
      member({ id: 'm-owner', displayName: 'Owner', userId: 'owner-1' }),
      member({ id: 'm-ana', displayName: 'Ana', userId: 'user-ana' }),
      member({ id: 'm-marta', displayName: 'Marta' }),
      member({
        id: 'm-pending',
        displayName: 'Pending',
        userId: 'user-pending',
        status: 'pending',
        invitedEmail: 'pending@example.com',
      }),
    ],
    items: [],
  };
}

describe('transferOwnership', () => {
  it('moves ownership to an accepted member with an account', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act
    const newOwnerId = await repo.transferOwnership('trip-1', 'm-ana');

    // Assert
    expect(newOwnerId).toBe('user-ana');
    const trip = await repo.findById('trip-1');
    expect(trip?.ownerId).toBe('user-ana');
  });

  it('keeps the previous owner on the trip as a regular member', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act
    await repo.transferOwnership('trip-1', 'm-ana');

    // Assert
    const trip = await repo.findById('trip-1');
    const previousOwner = trip?.members.find((m) => m.id === 'm-owner');
    expect(previousOwner?.userId).toBe('owner-1');
    expect(previousOwner?.status).toBe('accepted');
    expect(trip?.members).toHaveLength(4);
  });

  it('rejects a name-only member who has no account to own the trip', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act & Assert
    await expect(repo.transferOwnership('trip-1', 'm-marta')).rejects.toThrow(
      'member_has_no_account',
    );
  });

  it('rejects a member who has not accepted their invite yet', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act & Assert
    await expect(repo.transferOwnership('trip-1', 'm-pending')).rejects.toThrow(
      'member_not_accepted',
    );
  });

  it('rejects transferring to the current owner', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act & Assert
    await expect(repo.transferOwnership('trip-1', 'm-owner')).rejects.toThrow(
      'already_owner',
    );
  });

  it('rejects a member id that belongs to another trip', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act & Assert
    await expect(repo.transferOwnership('trip-1', 'm-nope')).rejects.toThrow(
      'member_not_found',
    );
  });
});
