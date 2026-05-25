'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Home, Map, Radio, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/motion/presets';

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/trips', label: 'Trips', icon: Map },
  { href: '/trips/trip-lisbon/now', label: 'Live', icon: Radio },
  { href: '/trips#profile', label: 'You', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

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
      </ul>
    </nav>
  );
}
