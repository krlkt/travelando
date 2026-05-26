import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Separator } from '@/components/ui/separator';

export const metadata = { title: 'Sign up · Travelando' };

export default function SignUpPage() {
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
        <GoogleButton label="Sign up with Google" />
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
