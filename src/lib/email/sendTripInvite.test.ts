import { describe, expect, it, vi } from 'vitest';
import { buildInviteAcceptUrl, sendTripInvite } from './sendTripInvite';
import type { EmailMessage } from './provider';

const params = {
  invitedEmail: 'friend@example.com',
  tripTitle: 'Lisbon',
  ownerName: 'Marta',
};

describe('buildInviteAcceptUrl', () => {
  it('points to /signup with the invited email and a trips destination', () => {
    // Act
    const url = new URL(
      buildInviteAcceptUrl('friend@example.com', 'https://app.test'),
    );

    // Assert
    expect(url.pathname).toBe('/signup');
    expect(url.searchParams.get('email')).toBe('friend@example.com');
    expect(url.searchParams.get('next')).toBe('/trips');
  });
});

describe('sendTripInvite', () => {
  it('sends a message addressed to the invitee', async () => {
    // Arrange
    const send = vi.fn(async () => ({ ok: true }));

    // Act
    const result = await sendTripInvite(params, send);

    // Assert
    expect(result.ok).toBe(true);
    const message = send.mock.calls[0][0] as EmailMessage;
    expect(message.to).toBe('friend@example.com');
    expect(message.subject).toContain('Lisbon');
  });

  it('returns a soft failure when the provider throws', async () => {
    // Arrange
    const send = vi.fn(async () => {
      throw new Error('network down');
    });

    // Act
    const result = await sendTripInvite(params, send);

    // Assert — never throws into the caller; reports the error instead.
    expect(result.ok).toBe(false);
    expect(result.error).toBe('network down');
  });
});
