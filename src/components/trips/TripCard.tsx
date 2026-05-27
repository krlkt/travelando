'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Radio, MoreHorizontal, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { fadeUp, spring } from '@/lib/motion/presets';
import {
  formatDateRange,
  tripDayCount,
  isOngoing,
  isUpcoming,
  relativeFromNow,
} from '@/lib/time/formatDate';
import {
  formatMoney,
  totalsByCurrency,
  findCurrentItem,
  findNextItem,
} from '@/lib/trips/grouping';
import { useTrips } from '@/lib/trips/context';
import type { Trip } from '@/lib/trips/types';

interface TripCardProps {
  trip: Trip;
  highlight?: boolean;
}

export function TripCard({ trip, highlight }: TripCardProps) {
  const { removeTrip } = useTrips();
  const now = new Date();
  const ongoing = isOngoing(trip.startDate, trip.endDate, now);
  const upcoming = isUpcoming(trip.startDate, now);
  const days = tripDayCount(trip.startDate, trip.endDate);
  const totals = totalsByCurrency(trip.items);
  const currentItem = ongoing ? findCurrentItem(trip.items, now) : null;
  const nextItem = ongoing ? findNextItem(trip.items, now) : null;

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={spring.soft}
      className="group border-border/70 bg-card relative overflow-hidden rounded-[var(--radius-xl)] border shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_18px_42px_-24px_oklch(20%_0.02_250_/_0.18)]"
    >
      <Link href={`/trips/${trip.id}`} className="block">
        <div
          className="relative h-40 w-full overflow-hidden"
          style={{ background: trip.coverGradient }}
        >
          <div
            aria-hidden
            className="grain absolute inset-0 opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div className="text-background drop-shadow-[0_1px_8px_oklch(15%_0.015_250_/_0.6)]">
              <div className="text-[10px] tracking-[0.18em] uppercase opacity-80">
                {trip.destination}
              </div>
              <h3 className="font-display text-2xl leading-tight tracking-tight">
                {trip.title}
              </h3>
            </div>
            {ongoing && (
              <Badge
                variant="primary"
                className="bg-background/85 text-foreground border-background/40 backdrop-blur-sm"
              >
                <Radio className="size-3 animate-pulse" />
                Now
              </Badge>
            )}
            {highlight && !ongoing && (
              <Badge
                variant="primary"
                className="bg-background/85 text-foreground border-background/40 backdrop-blur-sm"
              >
                Up next
              </Badge>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Calendar className="size-3.5" />
            {formatDateRange(trip.startDate, trip.endDate)}
            <span className="text-border" aria-hidden>
              ·
            </span>
            <span>
              {days} {days === 1 ? 'day' : 'days'}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`More for ${trip.title}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  if (!confirm(`Delete "${trip.title}"?`)) return;
                  void (async () => {
                    try {
                      await removeTrip(trip.id);
                      toast.success('Trip deleted');
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : 'Delete failed';
                      toast.error(`Couldn't delete trip: ${message}`);
                    }
                  })();
                }}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete trip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {ongoing && (currentItem || nextItem) ? (
          <div className="border-border/60 bg-secondary/40 space-y-1.5 rounded-[var(--radius)] border px-3 py-2 text-sm">
            {currentItem && (
              <div className="flex items-center gap-2">
                <span className="bg-primary size-1.5 shrink-0 animate-pulse rounded-full" />
                <span className="text-foreground/80 truncate">
                  Now ·{' '}
                  <span className="text-foreground">{currentItem.title}</span>
                </span>
              </div>
            )}
            {nextItem && (
              <div className="text-muted-foreground flex items-center gap-2">
                <span className="bg-muted-foreground/50 size-1.5 shrink-0 rounded-full" />
                <span className="truncate">
                  Next · {nextItem.title}{' '}
                  <span className="text-muted-foreground/70">
                    · {relativeFromNow(nextItem.startsAt, now)}
                  </span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {upcoming
                ? `Starts ${relativeFromNow(trip.startDate, now)}`
                : 'Past trip'}
            </span>
            <div className="flex -space-x-1.5">
              {trip.members.slice(0, 3).map((m) => (
                <span
                  key={m.id}
                  className="border-card bg-secondary text-secondary-foreground grid size-6 place-items-center overflow-hidden rounded-full border-2 text-[10px] font-medium uppercase"
                  title={m.displayName}
                >
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    m.displayName.slice(0, 1)
                  )}
                </span>
              ))}
              {trip.members.length > 3 && (
                <span className="border-card bg-muted text-muted-foreground grid size-6 place-items-center rounded-full border-2 text-[10px] font-medium">
                  +{trip.members.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {[...totals.entries()].slice(0, 3).map(([currency, amount]) => (
            <Badge key={currency} variant="outline">
              {formatMoney(amount, currency)}
            </Badge>
          ))}
          <Badge variant="muted">
            {trip.items.length} {trip.items.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>
      </div>
    </motion.article>
  );
}
