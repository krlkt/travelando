'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';
import type { AuthUser } from '@/lib/auth/types';

interface AccountMenuProps {
  user: AuthUser;
}

export function AccountMenu({ user }: AccountMenuProps) {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const initials = initialsFromUser(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="bg-secondary text-secondary-foreground border-border/60 grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border text-xs font-medium uppercase transition-transform hover:scale-[1.03] active:scale-[0.97]"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {user.displayName && (
              <span className="text-foreground text-sm">
                {user.displayName}
              </span>
            )}
            <span className="text-muted-foreground truncate text-xs">
              {user.email ?? 'Anonymous session'}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/trips">
            <UserIcon className="size-4" />
            Your trips
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            void (async () => {
              setPending(true);
              try {
                await signOut();
                toast.success('Signed out');
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : 'Sign-out failed';
                toast.error(message);
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SignInAffordanceProps {
  next?: string;
}

export function SignInAffordance({ next }: SignInAffordanceProps) {
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : '/signup';
  return (
    <div className="flex items-center gap-1">
      <Button asChild size="sm" variant="ghost">
        <Link href={loginHref}>Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href={signupHref}>Sign up</Link>
      </Button>
    </div>
  );
}

function initialsFromUser(user: AuthUser): string {
  if (user.displayName) {
    const parts = user.displayName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  }
  if (user.email) {
    return user.email[0]?.toUpperCase() ?? '?';
  }
  return '?';
}
