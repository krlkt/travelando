'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { signInSchema, signUpSchema } from '@/lib/auth/schemas';

type Mode = 'sign-in' | 'sign-up';

interface EmailPasswordFormProps {
  mode: Mode;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export function EmailPasswordForm({ mode }: EmailPasswordFormProps) {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search.get('next');
  const nextHref =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/trips';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const schema = mode === 'sign-in' ? signInSchema : signUpSchema;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email') next.email = issue.message;
        if (key === 'password') next.password = issue.message;
      }
      setErrors(next);
      return;
    }

    setPending(true);
    try {
      if (mode === 'sign-in') {
        await signInWithPassword(parsed.data);
        toast.success('Welcome back');
        router.push(nextHref);
      } else {
        const { needsEmailConfirmation } = await signUpWithPassword(
          parsed.data,
        );
        if (needsEmailConfirmation) {
          router.push(
            `/verify-email?email=${encodeURIComponent(parsed.data.email)}`,
          );
        } else {
          toast.success('Account created');
          router.push(nextHref);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : mode === 'sign-in'
            ? 'Sign-in failed'
            : 'Sign-up failed';
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const submitLabel = mode === 'sign-in' ? 'Sign in' : 'Create account';

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === 'sign-in' && (
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Forgot?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          autoComplete={
            mode === 'sign-in' ? 'current-password' : 'new-password'
          }
          required
          placeholder={
            mode === 'sign-up' ? 'At least 8 characters' : '••••••••'
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? 'Just a moment…' : submitLabel}
      </Button>
    </form>
  );
}
