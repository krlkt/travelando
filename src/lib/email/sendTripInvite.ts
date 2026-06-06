import { sendEmail, type EmailMessage, type EmailResult } from './provider';
import { buildTripInviteEmail } from './templates/tripInvite';

export interface TripInviteParams {
  invitedEmail: string;
  tripTitle: string;
  ownerName: string;
}

type SendFn = (message: EmailMessage) => Promise<EmailResult>;

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

// The link carries the invited email and a post-signup destination. No token is
// needed: access is still gated on the invitee signing up with this email (the
// handle_new_user trigger links the pending invite) and then accepting it. The
// email param only pre-fills the sign-up field.
export function buildInviteAcceptUrl(
  invitedEmail: string,
  baseUrl: string = appBaseUrl(),
): string {
  const url = new URL('/signup', baseUrl);
  url.searchParams.set('email', invitedEmail);
  url.searchParams.set('next', '/trips');
  return url.toString();
}

export async function sendTripInvite(
  params: TripInviteParams,
  send: SendFn = sendEmail,
): Promise<EmailResult> {
  const acceptUrl = buildInviteAcceptUrl(params.invitedEmail);
  const message = buildTripInviteEmail({ ...params, acceptUrl });

  try {
    return await send({ to: params.invitedEmail, ...message });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'email_send_failed',
    };
  }
}
