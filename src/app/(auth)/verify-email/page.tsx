import Link from 'next/link';
import { Mail } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';

export const metadata = { title: 'Check your inbox · Travelando' };

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { email } = await searchParams;
  return (
    <AuthCard
      eyebrow="Almost there"
      title="Check your inbox"
      description={
        email ? (
          <>
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            finish creating your account.
          </>
        ) : (
          'We sent a confirmation link to your email. Click it to finish creating your account.'
        )
      }
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="border-border/60 bg-secondary/40 flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-sm">
        <Mail className="text-muted-foreground size-4" />
        <span className="text-foreground/80">
          No email after a minute? Check your spam folder or try again.
        </span>
      </div>
    </AuthCard>
  );
}
