'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Map, Radio, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion/presets';

/**
 * Desktop counterpart to {@link TripBottomNav}. A compact floating pill rail
 * pinned to the left gutter and vertically centered, so it adds zero vertical
 * height to the page. Hidden on mobile, where the bottom nav takes over.
 */
export function TripDesktopNav() {
  const pathname = usePathname();
  const params = useParams();
  const rawId = params?.id;
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!tripId) return null;

  const overviewHref = `/trips/${tripId}`;
  const expensesHref = `/trips/${tripId}/expenses`;
  const liveHref = `/trips/${tripId}/now`;

  return (
    <nav
      aria-label="Trip sections"
      className="fixed top-1/2 left-3 z-40 hidden -translate-y-1/2 md:block lg:left-4 xl:left-6"
    >
      <ul className="border-border/60 bg-background/80 flex flex-col items-stretch gap-1 rounded-[1.75rem] border p-1.5 shadow-lg shadow-black/5 backdrop-blur-2xl">
        <RailTab
          href={overviewHref}
          label="Trip"
          icon={<Map className="size-[18px]" strokeWidth={1.8} />}
          active={pathname === overviewHref}
        />
        <RailTab
          href={expensesHref}
          label="Expenses"
          icon={<Wallet className="size-[18px]" strokeWidth={1.8} />}
          active={pathname === expensesHref}
        />
        <RailTab
          href={liveHref}
          label="Live"
          icon={<Radio className="size-[18px]" strokeWidth={1.8} />}
          active={pathname === liveHref}
        />
      </ul>
    </nav>
  );
}

interface RailTabProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

function RailTab({ href, label, icon, active }: RailTabProps) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className="focus-visible:ring-ring/60 relative flex w-[4.25rem] flex-col items-center gap-1 rounded-3xl px-1 py-2.5 outline-none focus-visible:ring-2"
      >
        {active && (
          <motion.span
            layoutId="trip-desktop-nav-indicator"
            className="bg-secondary absolute inset-0 rounded-3xl"
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
