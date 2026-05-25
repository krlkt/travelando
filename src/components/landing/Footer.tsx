import Link from 'next/link';
import { Plane } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-border/60 border-t px-6 py-12 md:px-10">
      <div className="mx-auto flex max-w-[var(--container-page)] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="bg-foreground text-background grid size-8 place-items-center rounded-full">
              <Plane className="size-3.5 -rotate-45" />
            </span>
            <span className="font-display text-lg tracking-tight">
              Travelando
            </span>
          </Link>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm">
            A trip planner that respects your attention. Built for the day, made
            for the road.
          </p>
        </div>
        <div className="text-muted-foreground flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link href="/trips" className="hover:text-foreground">
            Trips
          </Link>
          <Link href="/trips/trip-lisbon" className="hover:text-foreground">
            Demo
          </Link>
          <Link href="/trips/trip-lisbon/now" className="hover:text-foreground">
            Live
          </Link>
        </div>
      </div>
      <div className="text-muted-foreground/70 mx-auto mt-10 max-w-[var(--container-page)] text-xs">
        © {new Date().getFullYear()} Travelando
      </div>
    </footer>
  );
}
