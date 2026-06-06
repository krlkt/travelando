import type { EmailMessage, EmailProvider, EmailResult } from './provider';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Brevo transactional email. The free tier (300 emails/day) works with a single
// verified sender address — no custom domain required — which is why it's the
// default for this hobby deployment. Set BREVO_API_KEY and EMAIL_FROM (the
// address you verified in Brevo) to enable sending.
export const brevoProvider: EmailProvider = {
  async send(message: EmailMessage): Promise<EmailResult> {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM;

    // Missing config is a soft failure: the invite is already persisted and
    // discoverable from the invitee's dashboard, so we never crash the request.
    if (!apiKey || !fromEmail) {
      return { ok: false, error: 'email_not_configured' };
    }

    const fromName = process.env.EMAIL_FROM_NAME ?? 'Travelando';

    try {
      const res = await fetch(BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: fromName },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          textContent: message.text,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        return {
          ok: false,
          error: `brevo_${res.status}: ${detail.slice(0, 200)}`,
        };
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'email_send_failed',
      };
    }
  },
};
