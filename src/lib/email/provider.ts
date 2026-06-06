import { brevoProvider } from './brevo';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  ok: boolean;
  error?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailResult>;
}

// Single swap point for the email backend. To move off Brevo (e.g. to Resend
// once a custom domain is verified), change just this line — the template,
// orchestrator, and routes all stay the same.
function activeProvider(): EmailProvider {
  return brevoProvider;
}

export function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return activeProvider().send(message);
}
