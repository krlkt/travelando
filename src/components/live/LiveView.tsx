'use client';

import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Navigation,
  Radio,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTrips } from '@/lib/trips/context';
import { findCurrentItem, findNextItem } from '@/lib/trips/grouping';
import { kindMeta, transportIcons } from '@/lib/trips/kindMeta';
import { routeHeadline, routeStations } from '@/lib/trips/transportRoute';
import { directionsForItem } from '@/lib/trips/itemDirections';
import { openMapsLink } from '@/lib/places/maps-link';
import { formatTime, dayKey, relativeFromNow } from '@/lib/time/formatDate';
import { parseNaive } from '@/lib/time/naive';
import { useNow } from '@/lib/time/useNow';
import { spring } from '@/lib/motion/presets';
import { cn } from '@/lib/utils';
import type { TripItem } from '@/lib/trips/types';

interface LiveViewProps {
  tripId: string;
}

export function LiveView({ tripId }: LiveViewProps) {
  const { getTrip } = useTrips();
  const trip = getTrip(tripId);
  if (!trip) notFound();

  const now = useNow(60_000);
  const current = findCurrentItem(trip.items, now);
  const next = findNextItem(trip.items, now);

  const todayItems = useMemo(() => {
    const today = dayKey(now);
    return trip.items
      .filter((i) => dayKey(i.startsAt) === today)
      .sort(
        (a, b) =>
          parseNaive(a.startsAt).getTime() - parseNaive(b.startsAt).getTime(),
      );
  }, [trip.items, now]);

  const tomorrowItems = useMemo(() => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const key = dayKey(tomorrow);
    return trip.items
      .filter((i) => dayKey(i.startsAt) === key)
      .sort(
        (a, b) =>
          parseNaive(a.startsAt).getTime() - parseNaive(b.startsAt).getTime(),
      );
  }, [trip.items, now]);

  return (
    <div className="from-background via-background to-secondary/30 relative min-h-svh bg-gradient-to-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60svh]"
        style={{
          background: trip.coverGradient,
          opacity: 0.18,
          filter: 'blur(60px)',
        }}
      />

      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-end">
          <div className="border-border/70 bg-background/70 flex items-center gap-2 rounded-full border px-3 py-1 text-xs backdrop-blur-md">
            <Radio className="text-primary size-3 animate-pulse" />
            Live · {trip.title}
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="text-muted-foreground text-[10px] tracking-[0.24em] uppercase">
            Right now
          </div>
          <div className="font-display mt-2 text-5xl leading-none tracking-tight tabular-nums sm:text-6xl">
            {formatTime(now)}
          </div>
        </div>

        <div className="mt-10 grid gap-4">
          <AnimatePresence mode="wait">
            {current ? (
              <NowCard key={current.id} item={current} now={now} />
            ) : (
              <DowntimeCard key="downtime" next={next} now={now} />
            )}
          </AnimatePresence>

          {next && current && <NextCard item={next} now={now} />}
        </div>

        <DayList
          label="Today"
          items={todayItems}
          now={now}
          current={current}
          next={next}
          emptyCopy="Nothing on today's plan."
        />

        <DayList
          label="Tomorrow"
          items={tomorrowItems}
          now={now}
          current={null}
          next={null}
          emptyCopy="Nothing planned for tomorrow."
        />
      </div>
    </div>
  );
}

interface DayListProps {
  label: string;
  items: TripItem[];
  now: Date;
  current: TripItem | null;
  next: TripItem | null;
  emptyCopy: string;
}

function DayList({
  label,
  items,
  now,
  current,
  next,
  emptyCopy,
}: DayListProps) {
  return (
    <div className="mt-12">
      <div className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
        {label}
      </div>
      <ol className="mt-3 grid gap-1.5">
        {items.length === 0 ? (
          <li className="border-border/70 bg-secondary/20 text-muted-foreground rounded-[var(--radius)] border border-dashed px-4 py-6 text-center text-sm">
            {emptyCopy}
          </li>
        ) : (
          items.map((item) => {
            const isCurrent = current?.id === item.id;
            const isNext = next?.id === item.id;
            const isPast =
              parseNaive(item.endsAt ?? item.startsAt) < now && !isCurrent;
            const meta = kindMeta[item.kind];
            return (
              <li
                key={item.id}
                className={cn(
                  'bg-card flex gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-sm transition',
                  isCurrent
                    ? 'border-primary/30 bg-primary/[0.04] shadow-[0_0_0_4px_oklch(58%_0.16_38_/_0.08)]'
                    : isNext
                      ? 'border-accent/30'
                      : 'border-border/60',
                  isPast && 'opacity-50',
                )}
              >
                <span className="text-muted-foreground w-12 shrink-0 pt-0.5 text-xs tabular-nums">
                  {formatTime(item.startsAt)}
                </span>
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: meta.accent }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate">{item.title}</span>
                    {isCurrent && <Badge variant="primary">Now</Badge>}
                    {isNext && !isCurrent && (
                      <Badge variant="accent">Next</Badge>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-snug break-words whitespace-pre-wrap">
                      {item.notes}
                    </p>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ol>
    </div>
  );
}

/**
 * Tactile Google Maps CTA, adapted to the item:
 *  - normal stops get a "Get directions" link that routes from the device's
 *    live location to the place;
 *  - a transport item is itself an A → B journey, so it shows that leg's own
 *    "{from} → {to}" route instead of a redundant "navigate to it" link.
 * Renders nothing when the item has no usable location.
 */
function DirectionsCta({ item, accent }: { item: TripItem; accent: string }) {
  const directions = directionsForItem(item);
  if (!directions) return null;

  const isRoute = directions.kind === 'route';
  const Icon =
    isRoute && item.transportMode
      ? transportIcons[item.transportMode]
      : Navigation;

  return (
    <button
      type="button"
      onClick={() => openMapsLink(directions.url)}
      aria-label={
        isRoute
          ? `View route from ${directions.fromLabel} to ${directions.toLabel} in Google Maps`
          : `Get directions to ${directions.toLabel} in Google Maps`
      }
      className="group/dir border-border/60 bg-background/70 hover:border-foreground/15 focus-visible:ring-ring/60 relative mt-4 flex w-full items-center gap-3 rounded-full border py-2 pr-3 pl-2 text-left transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:shadow-[0_14px_30px_-18px_oklch(20%_0.02_250_/_0.35)] focus-visible:ring-2 focus-visible:outline-none active:translate-y-0"
    >
      <span
        aria-hidden
        className="text-background grid size-9 shrink-0 place-items-center rounded-full transition-transform group-hover/dir:scale-105"
        style={{ background: accent }}
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-tight font-medium">
          {isRoute ? 'View route' : 'Get directions'}
        </span>
        {isRoute ? (
          <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs leading-tight">
            <span className="truncate">{directions.fromLabel}</span>
            <ArrowRight className="size-3 shrink-0 opacity-60" />
            <span className="truncate">{directions.toLabel}</span>
          </span>
        ) : (
          <span className="text-muted-foreground block truncate text-xs leading-tight">
            to {directions.toLabel}
          </span>
        )}
      </span>
      <ArrowUpRight className="text-muted-foreground/70 mr-1 size-4 shrink-0 transition-transform group-hover/dir:translate-x-0.5 group-hover/dir:-translate-y-0.5" />
    </button>
  );
}

function NowCard({ item, now }: { item: TripItem; now: Date }) {
  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;

  const endsAt = item.endsAt ? parseNaive(item.endsAt) : null;
  const total = endsAt
    ? endsAt.getTime() - parseNaive(item.startsAt).getTime()
    : 0;
  const elapsed = endsAt
    ? now.getTime() - parseNaive(item.startsAt).getTime()
    : 0;
  const progress = total
    ? Math.min(100, Math.max(0, (elapsed / total) * 100))
    : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={spring.soft}
      className="border-border/70 bg-card relative overflow-hidden rounded-[var(--radius-xl)] border p-6 shadow-[0_24px_64px_-32px_oklch(20%_0.02_250_/_0.3)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full opacity-30 blur-3xl"
        style={{ background: meta.accent }}
      />
      <div className="relative flex items-start gap-4">
        <span
          className="text-background grid size-12 shrink-0 place-items-center rounded-2xl"
          style={{ background: meta.accent }}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <Badge variant={meta.badge}>{meta.label}</Badge>
          <h2 className="font-display mt-2 text-3xl leading-tight tracking-tight break-words">
            {item.title}
          </h2>
          {(() => {
            const route = routeHeadline(item);
            const stations = routeStations(item);
            if (!route.from && !route.to) return null;
            return (
              <>
                <div className="text-muted-foreground mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
                  {route.from && (
                    <span className="break-words">{route.from.label}</span>
                  )}
                  {route.from && route.to && (
                    <ArrowRight className="size-3.5 shrink-0" />
                  )}
                  {route.to && (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="break-words">{route.to.label}</span>
                    </span>
                  )}
                </div>
                {stations && (
                  <div className="text-muted-foreground/70 mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
                    {stations.from && (
                      <span className="break-words">{stations.from.label}</span>
                    )}
                    {stations.from && stations.to && (
                      <ArrowRight className="size-3 shrink-0" />
                    )}
                    {stations.to && (
                      <span className="break-words">{stations.to.label}</span>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="relative mt-5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground tabular-nums">
          {formatTime(item.startsAt)}
          {item.endsAt && <> → {formatTime(item.endsAt)}</>}
        </span>
        {endsAt && (
          <span className="text-foreground/80 tabular-nums">
            {relativeFromNow(item.endsAt!, now)}
          </span>
        )}
      </div>

      {endsAt && (
        <div className="bg-secondary/60 relative mt-3 h-1.5 overflow-hidden rounded-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: meta.accent }}
          />
        </div>
      )}

      {item.notes && (
        <p className="text-foreground/80 relative mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {item.notes}
        </p>
      )}
    </motion.section>
  );
}

function NextCard({ item, now }: { item: TripItem; now: Date }) {
  const meta = kindMeta[item.kind];
  const Icon =
    item.kind === 'transport' && item.transportMode
      ? transportIcons[item.transportMode]
      : meta.icon;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.soft, delay: 0.05 }}
      className="border-border/60 bg-secondary/30 rounded-[var(--radius-xl)] border p-5"
    >
      <div className="text-muted-foreground flex items-center justify-between text-[10px] tracking-[0.18em] uppercase">
        <span>Up next</span>
        <span>{relativeFromNow(item.startsAt, now)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span
          className="text-background grid size-9 shrink-0 place-items-center rounded-full"
          style={{ background: meta.accent }}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="leading-tight font-medium break-words">
            {item.title}
          </div>
          {(() => {
            const dest = routeHeadline(item).to;
            if (!dest) return null;
            return (
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                <MapPin className="size-3" />
                <span className="truncate">{dest.label}</span>
              </div>
            );
          })()}
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatTime(item.startsAt)}
        </span>
      </div>
      <DirectionsCta item={item} accent={meta.accent} />
    </motion.section>
  );
}

function DowntimeCard({ next, now }: { next: TripItem | null; now: Date }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={spring.soft}
      className="border-border/70 bg-card rounded-[var(--radius-xl)] border p-6 text-center"
    >
      <h2 className="font-display text-3xl leading-tight tracking-tight">
        Quiet for a bit
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Nothing scheduled right now. Stretch, get a coffee, breathe.
      </p>
      {next && (
        <>
          <div className="border-border/70 bg-background mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
            <span className="text-muted-foreground">Next:</span>
            <span className="font-medium">{next.title}</span>
            <span className="text-muted-foreground">
              · {relativeFromNow(next.startsAt, now)}
            </span>
          </div>
          <div className="mx-auto max-w-xs">
            <DirectionsCta item={next} accent={kindMeta[next.kind].accent} />
          </div>
        </>
      )}
    </motion.section>
  );
}
