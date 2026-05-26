'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/context';
import { updatePasswordSchema } from '@/lib/auth/schemas';

export default function UpdatePasswordPage() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = updatePasswordSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid password');
      return;
    }

    setPending(true);
    try {
      await updatePassword(parsed.data.password);
      toast.success('Password updated');
      router.push('/trips');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not update password';
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      eyebrow="New password"
      title="Set a new password"
      description="Pick something at least 8 characters long."
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            aria-invalid={!!error}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
}
