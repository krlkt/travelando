import { describe, expect, it } from 'vitest';
import { createInMemoryRepository } from './inMemoryRepository';
import type { Trip } from './types';

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
      {
        id: 'm-owner',
        tripId: 'trip-1',
        displayName: 'Owner',
        userId: 'owner-1',
        status: 'accepted',
      },
    ],
    items: [],
  };
}

describe('member invitations', () => {
  it('adds a name-only member as accepted with no invite email', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act
    const member = await repo.addMember('trip-1', { displayName: 'Marta' });

    // Assert
    expect(member.status).toBe('accepted');
    expect(member.invitedEmail).toBeUndefined();
    expect(member.userId).toBeUndefined();
  });

  it('creates a pending invite when adding by email', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);

    // Act
    const member = await repo.addMember('trip-1', {
      email: 'friend@example.com',
    });

    // Assert
    expect(member.status).toBe('pending');
    expect(member.invitedEmail).toBe('friend@example.com');
  });

  it('claims a name-only member without creating a duplicate row', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);
    const placeholder = await repo.addMember('trip-1', {
      displayName: 'Marta',
    });

    // Act
    const invited = await repo.inviteMember('trip-1', placeholder.id, {
      email: 'marta@example.com',
    });
    const members = await repo.listMembers('trip-1');

    // Assert — same row, now pending; no extra member created.
    expect(invited.id).toBe(placeholder.id);
    expect(invited.status).toBe('pending');
    expect(invited.invitedEmail).toBe('marta@example.com');
    expect(members.filter((m) => m.displayName === 'Marta')).toHaveLength(1);
  });

  it('lists pending invitations and clears them on accept', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);
    const invite = await repo.addMember('trip-1', {
      email: 'friend@example.com',
    });

    // Act
    const pending = await repo.listMyInvitations();
    const tripId = await repo.acceptInvitation(invite.id);
    const afterAccept = await repo.listMyInvitations();
    const members = await repo.listMembers('trip-1');

    // Assert
    expect(pending.map((i) => i.memberId)).toContain(invite.id);
    expect(tripId).toBe('trip-1');
    expect(afterAccept).toHaveLength(0);
    expect(members.find((m) => m.id === invite.id)?.status).toBe('accepted');
  });

  it('removes a fresh email invite on decline (no prior member)', async () => {
    // Arrange
    const repo = createInMemoryRepository([seedTrip()]);
    const invite = await repo.addMember('trip-1', {
      email: 'friend@example.com',
    });

    // Act
    await repo.declineInvitation(invite.id);
    const members = await repo.listMembers('trip-1');

    // Assert
    expect(members.find((m) => m.id === invite.id)).toBeUndefined();
  });

  it('reverts a claimed name-only member on decline instead of deleting', async () => {
    // Arrange — a name-only member claimed via invite.
    const repo = createInMemoryRepository([seedTrip()]);
    const placeholder = await repo.addMember('trip-1', {
      displayName: 'Marta',
    });
    await repo.inviteMember('trip-1', placeholder.id, {
      email: 'marta@example.com',
    });

    // Act
    await repo.declineInvitation(placeholder.id);
    const members = await repo.listMembers('trip-1');
    const reverted = members.find((m) => m.id === placeholder.id);

    // Assert — the original name-only member survives, account link cleared.
    expect(reverted).toBeDefined();
    expect(reverted?.displayName).toBe('Marta');
    expect(reverted?.status).toBe('accepted');
    expect(reverted?.userId).toBeUndefined();
    expect(reverted?.invitedEmail).toBeUndefined();
    expect(reverted?.revertToNameOnly).toBe(false);
  });
});
