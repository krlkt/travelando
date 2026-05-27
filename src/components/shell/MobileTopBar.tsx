'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, Plane } from 'lucide-react';
import { MobileMenu } from './MobileMenu';

const TRIP_DETAIL_RE = /^\/trips\/[^/]+(\/.*)?$/;

export function MobileTopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (TRIP_DETAIL_RE.test(pathname)) return null;

  return (
    <>
      <header className="bg-background/80 border-border/60 sticky top-0 z-40 border-b backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-14 items-center justify-between px-3">
          <Link href="/" className="group flex items-center gap-2">
            <span className="bg-foreground text-background grid size-8 place-items-center rounded-full">
              <Plane className="size-3.5 -rotate-45" />
            </span>
            <span className="font-display text-lg tracking-tight">
              Travelando
            </span>
          </Link>

          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="focus-visible:ring-ring/60 grid size-10 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <MobileMenu open={open} onOpenChange={setOpen} pathname={pathname} />
    </>
  );
}
