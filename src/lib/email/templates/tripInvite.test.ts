import { describe, expect, it } from 'vitest';
import { buildTripInviteEmail, escapeHtml } from './tripInvite';

describe('buildTripInviteEmail', () => {
  const base = {
    invitedEmail: 'friend@example.com',
    tripTitle: 'Lisbon',
    ownerName: 'Marta',
    acceptUrl: 'https://travelando.example/signup?email=friend%40example.com',
  };

  it('includes the accept URL in both html and text bodies', () => {
    // Act
    const { html, text } = buildTripInviteEmail(base);

    // Assert
    expect(html).toContain(base.acceptUrl);
    expect(text).toContain(base.acceptUrl);
  });

  it('names the owner and trip in the subject', () => {
    // Act
    const { subject } = buildTripInviteEmail(base);

    // Assert
    expect(subject).toContain('Marta');
    expect(subject).toContain('Lisbon');
  });

  it('escapes HTML in user-controlled trip titles', () => {
    // Arrange
    const malicious = {
      ...base,
      tripTitle: '<script>alert(1)</script>',
    };

    // Act
    const { html } = buildTripInviteEmail(malicious);

    // Assert — raw tag never reaches the markup; escaped form does.
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('strips newlines from the subject to prevent header injection', () => {
    // Arrange
    const injected = {
      ...base,
      tripTitle: 'Trip\r\nBcc: victim@example.com',
    };

    // Act
    const { subject } = buildTripInviteEmail(injected);

    // Assert
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe('escapeHtml', () => {
  it('escapes the five sensitive characters', () => {
    // Act
    const escaped = escapeHtml(`<>&"'`);

    // Assert
    expect(escaped).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});
