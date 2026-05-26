'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';

interface GoogleButtonProps {
  label?: string;
  redirectTo?: string;
}

export function GoogleButton({
  label = 'Continue with Google',
  redirectTo,
}: GoogleButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={pending}
      className="w-full"
      onClick={async () => {
        setPending(true);
        try {
          await signInWithGoogle(redirectTo);
          // Redirect happens via Supabase — keep pending until navigation.
        } catch (err) {
          setPending(false);
          const message =
            err instanceof Error ? err.message : 'Google sign-in failed';
          toast.error(message);
        }
      }}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GoogleGlyph className="size-4" />
      )}
      {label}
    </Button>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.63Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7a5.41 5.41 0 0 1 0-3.4V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l2.99 2.34C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
