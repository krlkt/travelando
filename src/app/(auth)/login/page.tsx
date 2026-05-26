import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/AuthCard';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Separator } from '@/components/ui/separator';

export const metadata = { title: 'Sign in · Travelando' };

export default function LoginPage() {
  return (
    <AuthCard
      eyebrow="Welcome back"
      title={
        <>
          Plan the <span className="italic">next one</span>.
        </>
      }
      description="Sign in to sync trips across your devices."
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="text-foreground hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <GoogleButton />
        <DividerWithLabel label="or with email" />
        <Suspense fallback={null}>
          <EmailPasswordForm mode="sign-in" />
        </Suspense>
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
