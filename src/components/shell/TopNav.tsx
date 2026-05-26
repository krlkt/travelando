'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/context';
import { AccountMenu, SignInAffordance } from '@/components/auth/AccountMenu';

const links = [
  { href: '/', label: 'Home' },
  { href: '/trips', label: 'Trips' },
];

export function TopNav() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const { user, loading } = useAuth();
  const isPermanent = !!user && !user.isAnonymous;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 hidden transition-colors md:block',
        isLanding
          ? 'bg-background/40 backdrop-blur-xl'
          : 'bg-background/80 border-border/60 border-b backdrop-blur-xl',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[var(--container-page)] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="group flex items-center gap-2">
          <span className="bg-foreground text-background grid size-9 place-items-center rounded-full transition-transform group-hover:rotate-[8deg]">
            <Plane className="size-4 -rotate-45" />
          </span>
          <span className="font-display text-xl tracking-tight">
            Travelando
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-full px-4 py-2 transition-colors',
                  active
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <div
              aria-hidden
              className="bg-secondary/60 size-9 animate-pulse rounded-full"
            />
          ) : isPermanent && user ? (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/trips">Open the app</Link>
              </Button>
              <AccountMenu user={user} />
            </>
          ) : (
            <SignInAffordance next={isLanding ? '/trips' : pathname} />
          )}
        </div>
      </div>
    </header>
  );
}
