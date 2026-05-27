'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Home, LogOut, Map, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';
import { useTripsOptional } from '@/lib/trips/context';
import { isOngoing, isUpcoming } from '@/lib/time/formatDate';
import type { AuthUser } from '@/lib/auth/types';
import type { Trip } from '@/lib/trips/types';

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}

const MAX_RECENT = 5;

export function MobileMenu({ open, onOpenChange, pathname }: MobileMenuProps) {
  const { user, loading, signOut } = useAuth();
  const tripsCtx = useTripsOptional();
  const trips = tripsCtx?.trips ?? [];
  const [pending, setPending] = useState(false);
  const isPermanent = !!user && !user.isAnonymous;
  const nextParam = encodeURIComponent(pathname || '/trips');

  const recentTrips = useMemo<Trip[]>(() => {
    const now = new Date();
    const sorted = [...trips].sort((a, b) => {
      const aOngoing = isOngoing(a.startDate, a.endDate, now);
      const bOngoing = isOngoing(b.startDate, b.endDate, now);
      if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;

      const aUpcoming = isUpcoming(a.startDate, now);
      const bUpcoming = isUpcoming(b.startDate, now);
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;

      const aStart = new Date(a.startDate).getTime();
      const bStart = new Date(b.startDate).getTime();
      if (aUpcoming) return aStart - bStart;
      return bStart - aStart;
    });
    return sorted.slice(0, MAX_RECENT);
  }, [trips]);

  const close = (): void => onOpenChange(false);

  const handleSignOut = async (): Promise<void> => {
    setPending(true);
    try {
      await signOut();
      toast.success('Signed out');
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Navigation and account
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-1">
          <NavLink
            href="/"
            icon={<Home className="size-4" />}
            label="Home"
            onClick={close}
          />
          <NavLink
            href="/trips"
            icon={<Map className="size-4" />}
            label="Trips"
            onClick={close}
          />
          <NavLink
            href="/trips/trip-lisbon/now"
            icon={<Radio className="size-4" />}
            label="Live demo"
            onClick={close}
          />
        </div>

        {recentTrips.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 px-1">
            <div className="text-muted-foreground px-3 pt-2 pb-1 text-[10px] tracking-[0.18em] uppercase">
              Recent trips
            </div>
            {recentTrips.map((t) => (
              <Link
                key={t.id}
                href={`/trips/${t.id}`}
                onClick={close}
                className="hover:bg-secondary/60 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition"
              >
                <span
                  className="border-border/60 size-6 shrink-0 rounded-md border"
                  style={{ background: t.coverGradient }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="bg-border/60 mx-3 my-3 h-px" />

        <AccountBlock
          user={user}
          loading={loading}
          isPermanent={isPermanent}
          pending={pending}
          nextParam={nextParam}
          onClose={close}
          onSignOut={() => void handleSignOut()}
        />
      </SheetContent>
    </Sheet>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function NavLink({ href, icon, label, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

interface AccountBlockProps {
  user: AuthUser | null;
  loading: boolean;
  isPermanent: boolean;
  pending: boolean;
  nextParam: string;
  onClose: () => void;
  onSignOut: () => void;
}

function AccountBlock({
  user,
  loading,
  isPermanent,
  pending,
  nextParam,
  onClose,
  onSignOut,
}: AccountBlockProps) {
  if (loading) {
    return (
      <div className="bg-secondary/60 mx-1 h-16 animate-pulse rounded-2xl" />
    );
  }

  if (isPermanent && user) {
    return (
      <div className="flex flex-col gap-3 px-1">
        <div className="border-border/60 bg-secondary/30 flex items-center gap-3 rounded-2xl border p-3">
          <div className="bg-secondary text-secondary-foreground border-border/60 grid size-10 place-items-center overflow-hidden rounded-full border text-sm font-medium uppercase">
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
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          {pending ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-1">
      <Button asChild size="lg" onClick={onClose}>
        <Link href={`/login?next=${nextParam}`}>Sign in</Link>
      </Button>
      <Button asChild size="lg" variant="secondary" onClick={onClose}>
        <Link href={`/signup?next=${nextParam}`}>Create account</Link>
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
