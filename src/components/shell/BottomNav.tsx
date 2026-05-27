'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Home, LogOut, Map, Radio, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion/presets';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';
import type { AuthUser } from '@/lib/auth/types';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/trips', label: 'Trips', icon: Map },
  { href: '/trips/trip-lisbon/now', label: 'Live', icon: Radio },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, loading } = useAuth();
  const isPermanent = !!user && !user.isAnonymous;

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    if (href.includes('/now')) return pathname.endsWith('/now');
    if (href === '/trips')
      return (
        pathname === '/trips' ||
        (pathname.startsWith('/trips/') && !pathname.endsWith('/now'))
      );
    return false;
  };

  return (
    <>
      <nav
        aria-label="Primary"
        className="bg-background/80 border-border/60 fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-2xl md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between gap-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className="focus-visible:ring-ring/60 relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none focus-visible:ring-2"
                >
                  {active && (
                    <motion.span
                      layoutId="bottomnav-indicator"
                      className="bg-secondary absolute inset-0 rounded-2xl"
                      transition={spring.snappy}
                    />
                  )}
                  <span
                    className={cn(
                      'relative grid place-items-center transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <Icon
                      className="size-[18px]"
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                  </span>
                  <span
                    className={cn(
                      'relative text-[10px] leading-none font-medium tracking-wide transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="Account"
              className="focus-visible:ring-ring/60 relative flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none focus-visible:ring-2"
            >
              <span
                className={cn(
                  'relative grid place-items-center transition-colors',
                  accountOpen ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {isPermanent && user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-[20px] rounded-full object-cover"
                  />
                ) : (
                  <User
                    className="size-[18px]"
                    strokeWidth={accountOpen ? 2.2 : 1.8}
                  />
                )}
              </span>
              <span
                className={cn(
                  'relative text-[10px] leading-none font-medium tracking-wide transition-colors',
                  accountOpen ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                You
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <AccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        user={user}
        loading={loading}
        isPermanent={isPermanent}
        pathname={pathname}
      />
    </>
  );
}

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null;
  loading: boolean;
  isPermanent: boolean;
  pathname: string;
}

function AccountSheet({
  open,
  onOpenChange,
  user,
  loading,
  isPermanent,
  pathname,
}: AccountSheetProps) {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const nextParam = encodeURIComponent(pathname || '/trips');

  const handleSignOut = async (): Promise<void> => {
    setPending(true);
    try {
      await signOut();
      toast.success('Signed out');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Account</SheetTitle>
          <SheetDescription>
            {loading
              ? 'Checking your session…'
              : isPermanent
                ? 'You are signed in.'
                : 'Sign in to sync your trips across devices.'}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="bg-secondary/60 h-16 animate-pulse rounded-2xl" />
        ) : isPermanent && user ? (
          <div className="flex flex-col gap-4">
            <div className="border-border/60 bg-secondary/30 flex items-center gap-3 rounded-2xl border p-4">
              <div className="bg-secondary text-secondary-foreground border-border/60 grid size-12 place-items-center overflow-hidden rounded-full border text-sm font-medium uppercase">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  initialsFromUser(user)
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                {user.displayName && (
                  <span className="text-foreground truncate text-sm font-medium">
                    {user.displayName}
                  </span>
                )}
                <span className="text-muted-foreground truncate text-xs">
                  {user.email ?? 'Signed in'}
                </span>
              </div>
            </div>

            <Button
              asChild
              size="lg"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              <Link href="/trips">Your trips</Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() => {
                void handleSignOut();
              }}
            >
              <LogOut className="size-4" />
              {pending ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" onClick={() => onOpenChange(false)}>
              <Link href={`/login?next=${nextParam}`}>Sign in</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              <Link href={`/signup?next=${nextParam}`}>Create account</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
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
