'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Map, Menu, Radio, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion/presets';
import { MobileMenu } from './MobileMenu';

export function TripBottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const rawId = params?.id;
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [menuOpen, setMenuOpen] = useState(false);

  if (!tripId) return null;

  const overviewHref = `/trips/${tripId}`;
  const wishlistsHref = `/trips/${tripId}/wishlists`;
  const expensesHref = `/trips/${tripId}/expenses`;
  const liveHref = `/trips/${tripId}/now`;
  const overviewActive = pathname === overviewHref;
  const wishlistsActive = pathname === wishlistsHref;
  const expensesActive = pathname === expensesHref;
  const liveActive = pathname === liveHref;

  return (
    <>
      <nav
        aria-label="Trip"
        className="bg-background/80 border-border/60 fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-2xl md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-between gap-0.5">
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="focus-visible:ring-ring/60 relative flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none focus-visible:ring-2"
            >
              <span className="text-muted-foreground relative grid place-items-center transition-colors">
                <Menu className="size-[18px]" strokeWidth={1.8} />
              </span>
              <span className="text-muted-foreground relative text-[10px] leading-none font-medium tracking-wide">
                Menu
              </span>
            </button>
          </li>
          <Tab
            href={overviewHref}
            label="Trip"
            icon={<Map className="size-[18px]" />}
            active={overviewActive}
          />
          <Tab
            href={wishlistsHref}
            label="Wishlist"
            icon={<Heart className="size-[18px]" />}
            active={wishlistsActive}
          />
          <Tab
            href={expensesHref}
            label="Expenses"
            icon={<Wallet className="size-[18px]" />}
            active={expensesActive}
          />
          <Tab
            href={liveHref}
            label="Live"
            icon={<Radio className="size-[18px]" />}
            active={liveActive}
          />
        </ul>
      </nav>

      <MobileMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        pathname={pathname}
      />
    </>
  );
}

interface TabProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function Tab({ href, label, icon, active }: TabProps) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className="focus-visible:ring-ring/60 relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 outline-none focus-visible:ring-2"
      >
        {active && (
          <motion.span
            layoutId="tripnav-indicator"
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
          {icon}
        </span>
        <span
          className={cn(
            'relative text-[10px] leading-none font-medium tracking-wide transition-colors',
            active ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
      </Link>
    </li>
  );
}
