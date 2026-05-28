'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripCard } from './TripCard';
import { TripEditorSheet } from './editor/TripEditorSheet';
import { useTrips } from '@/lib/trips/context';
import { isDemoTrip } from '@/lib/trips/demoTrips';
import { isOngoing, isUpcoming } from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { Trip } from '@/lib/trips/types';

export function TripsDashboard() {
  const { trips, loadTripExtras } = useTrips();
  const [editorOpen, setEditorOpen] = useState(false);
  const loadedRef = useRef(new Set<string>());

  const visibleTrips = useMemo(
    () => trips.filter((t) => !isDemoTrip(t.id)),
    [trips],
  );

  const { ongoing, upcoming, past } = useMemo(() => {
    const now = new Date();
    const o: Trip[] = [];
    const u: Trip[] = [];
    const p: Trip[] = [];
    const sorted = [...visibleTrips].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    for (const t of sorted) {
      if (isOngoing(t.startDate, t.endDate, now)) o.push(t);
      else if (isUpcoming(t.startDate, now)) u.push(t);
      else p.push(t);
    }
    return { ongoing: o, upcoming: u, past: p.reverse() };
  }, [visibleTrips]);

  useEffect(() => {
    for (const trip of visibleTrips) {
      if (!loadedRef.current.has(trip.id)) {
        loadedRef.current.add(trip.id);
        void loadTripExtras(trip.id);
      }
    }
  }, [visibleTrips, loadTripExtras]);

  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 md:px-10 md:pt-14">
      <div className="mx-auto max-w-[var(--container-page)]">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger(0, 0.08)}
          className="flex items-end justify-between gap-4"
        >
          <motion.div variants={fadeUp}>
            <div className="text-muted-foreground text-[10px] tracking-[0.2em] uppercase">
              Your trips
            </div>
            <h1 className="font-display mt-2 text-4xl leading-tight tracking-tight md:text-5xl">
              Where to <span className="text-primary italic">next?</span>
            </h1>
          </motion.div>
          <motion.div variants={fadeUp} className="hidden md:block">
            <Button size="lg" onClick={() => setEditorOpen(true)}>
              <Plus className="size-4" />
              New trip
            </Button>
          </motion.div>
        </motion.div>

        {visibleTrips.length === 0 ? (
          <EmptyState onCreate={() => setEditorOpen(true)} />
        ) : (
          <div className="mt-12 space-y-14">
            {ongoing.length > 0 && (
              <Section label="On the road" sub="Live right now">
                <Grid trips={ongoing} highlightFirst={false} />
              </Section>
            )}
            {upcoming.length > 0 && (
              <Section
                label="Coming up"
                sub={`${upcoming.length} on the calendar`}
              >
                <Grid trips={upcoming} highlightFirst />
              </Section>
            )}
            {past.length > 0 && (
              <Section label="Memories" sub="Already happened">
                <Grid trips={past} muted />
              </Section>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setEditorOpen(true)}
        aria-label="New trip"
        className="bg-primary text-primary-foreground fixed right-4 bottom-24 z-30 grid size-14 cursor-pointer place-items-center rounded-full shadow-[0_18px_42px_-12px_oklch(58%_0.16_38_/_0.6)] transition-transform active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <TripEditorSheet open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}

function Section({
  label,
  sub,
  children,
}: {
  label: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-baseline justify-between gap-3"
      >
        <h2 className="font-display text-2xl leading-tight tracking-tight">
          {label}
        </h2>
        <span className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          {sub}
        </span>
      </motion.div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Grid({
  trips,
  highlightFirst,
  muted,
}: {
  trips: Trip[];
  highlightFirst?: boolean;
  muted?: boolean;
}) {
  return (
    <motion.ul
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger(0.05, 0.08)}
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${muted ? 'opacity-90' : ''}`}
    >
      {trips.map((trip, i) => (
        <li key={trip.id}>
          <TripCard trip={trip} highlight={highlightFirst && i === 0} />
        </li>
      ))}
    </motion.ul>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="border-border/70 bg-secondary/20 mt-12 grid place-items-center rounded-[var(--radius-xl)] border border-dashed px-6 py-20 text-center"
    >
      <Sparkles className="text-primary size-6" />
      <h2 className="font-display mt-4 text-3xl tracking-tight">
        No trips yet
      </h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Start with the bones — title, destination, dates. You can fill in the
        days as you go.
      </p>
      <Button size="lg" className="mt-6" onClick={onCreate}>
        <Plus className="size-4" />
        Plan your first trip
      </Button>
    </motion.div>
  );
}
