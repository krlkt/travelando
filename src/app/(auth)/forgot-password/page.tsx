'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { passwordResetSchema } from '@/lib/auth/schemas';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = passwordResetSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email');
      return;
    }

    setPending(true);
    try {
      await resetPassword(parsed.data.email);
      setSent(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send reset email';
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="Reset"
      title="Forgot your password?"
      description="Enter the email you signed up with and we'll send a reset link."
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-foreground/80 text-sm leading-relaxed">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way. Check your inbox (and spam folder).
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              aria-invalid={!!error}
            />
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
