import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Separator } from '@/components/ui/separator';

export const metadata = { title: 'Sign up · Travelando' };

interface SignUpPageProps {
  searchParams: Promise<{ email?: string; next?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const invitedEmail = params.email?.trim();
  const next =
    params.next?.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/trips';

  return (
    <AuthCard
      eyebrow="Get started"
      title={
        <>
          A calmer way to plan, <span className="italic">together</span>.
        </>
      }
      description="Create an account to keep your trips, expenses, and live timeline in sync."
      footer={
        <>
          Already have one?{' '}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {invitedEmail && <InviteNotice email={invitedEmail} />}
        <GoogleButton label="Sign up with Google" redirectTo={next} />
        <DividerWithLabel label="or with email" />
        <Suspense fallback={null}>
          <EmailPasswordForm mode="sign-up" />
        </Suspense>
        <p className="text-muted-foreground text-xs leading-relaxed">
          By creating an account you agree to our terms of service and privacy
          policy.
        </p>
      </div>
    </AuthCard>
  );
}

function InviteNotice({ email }: { email: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-700 dark:text-amber-300">
      <p className="font-medium">You&apos;ve been invited to a trip</p>
      <p className="text-amber-700/80 dark:text-amber-300/80">
        Finish signing up with <strong>{email}</strong> — by email or with
        Google — and the invite will be waiting on your dashboard.
      </p>
    </div>
  );
}

function DividerWithLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}
