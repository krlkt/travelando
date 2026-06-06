export interface TripInviteTemplateParams {
  invitedEmail: string;
  tripTitle: string;
  ownerName: string;
  acceptUrl: string;
}

export interface TripInviteContent {
  subject: string;
  html: string;
  text: string;
}

// Trip titles and owner names are user-controlled and land inside email HTML,
// so every interpolated value is escaped to prevent markup/script injection.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Subject lines are email headers; collapse any newlines to defuse header
// injection from user-supplied trip titles or names.
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function buildTripInviteEmail(
  params: TripInviteTemplateParams,
): TripInviteContent {
  const trip = escapeHtml(params.tripTitle);
  const owner = escapeHtml(params.ownerName);
  const url = escapeHtml(params.acceptUrl);

  const subject = `${headerSafe(params.ownerName)} invited you to ${headerSafe(
    params.tripTitle,
  )} on Travelando`;

  const text = [
    `${params.ownerName} invited you to join "${params.tripTitle}" on Travelando.`,
    '',
    'Travelando is a calmer way to plan trips together — itinerary, expenses,',
    'and a live timeline, all in sync.',
    '',
    `Create your account to join: ${params.acceptUrl}`,
    '',
    `This invite was sent to ${params.invitedEmail}. Sign up with this address`,
    '(by email or with Google) so the invite links to your new account.',
    '',
    'If you were not expecting this, you can safely ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1a17;">
    <div style="display:none;max-height:0;overflow:hidden;color:#f4f1ec;">${owner} invited you to ${trip} on Travelando.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(28,26,23,0.08);">
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 24px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#9b958c;">Travelando</p>
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:600;">
                  ${owner} invited you to <span style="font-style:italic;">${trip}</span>
                </h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#54504a;">
                  Plan the itinerary, split expenses, and follow a live timeline together. Create your account to join the trip.
                </p>
                <a href="${url}" style="display:inline-block;background:#1c1a17;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 26px;border-radius:999px;">
                  Join the trip
                </a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#9b958c;">
                  Sign up with <strong style="color:#54504a;">${escapeHtml(
                    params.invitedEmail,
                  )}</strong> — by email or with Google — so the invite links to your account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#b4afa6;border-top:1px solid #eee7dd;padding-top:16px;">
                  If you weren't expecting this, you can ignore this email. The link only opens the sign-up page.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
