'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Radio, MoreHorizontal, Trash2, LogOut, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { fadeUp, spring } from '@/lib/motion/presets';
import {
  formatDateRange,
  tripDayCount,
  isOngoing,
  isUpcoming,
  relativeFromNow,
} from '@/lib/time/formatDate';
import {
  findCurrentItem,
  findNextItem,
  formatMoney,
} from '@/lib/trips/grouping';
import { aggregateByCurrency } from '@/lib/trips/expenseTotals';
import { useTrips } from '@/lib/trips/context';
import { useAuth } from '@/lib/auth/context';
import { useNow } from '@/lib/time/useNow';
import type { Trip } from '@/lib/trips/types';

interface TripCardProps {
  trip: Trip;
  highlight?: boolean;
}

export function TripCard({ trip, highlight }: TripCardProps) {
  const { removeTrip, removeMember, expenses } = useTrips();
  const { user, loading: authLoading } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Reactive, client-local clock so ongoing/upcoming and the current item stay
  // correct in the viewer's timezone and refresh as time passes.
  const now = useNow();

  const isOwner = Boolean(user && trip.ownerId && trip.ownerId === user.id);
  const myMembership = user
    ? trip.members.find((m) => m.userId === user.id)
    : undefined;
  // Owner deletes; a non-owner member leaves. Until auth resolves (or for a
  // user with no membership), show no destructive action at all.
  const destructiveAction: 'delete' | 'leave' | null = authLoading
    ? null
    : isOwner
      ? 'delete'
      : myMembership
        ? 'leave'
        : null;

  const tripExpenses = expenses[trip.id] ?? [];
  const expenseTotals =
    tripExpenses.length > 0 ? aggregateByCurrency(tripExpenses, null) : null;
  const ongoing = isOngoing(trip.startDate, trip.endDate, now);
  const upcoming = isUpcoming(trip.startDate, now);
  const days = tripDayCount(trip.startDate, trip.endDate);
  const currentItem = ongoing ? findCurrentItem(trip.items, now) : null;
  const nextItem = ongoing ? findNextItem(trip.items, now) : null;

  return (
    <>
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
            {destructiveAction && (
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
                  {destructiveAction === 'delete' ? (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setDeleteOpen(true);
                      }}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete trip
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setLeaveOpen(true);
                      }}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <LogOut className="size-4" />
                      Leave trip
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
                  : ongoing
                    ? 'Happening now'
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
            <Badge variant="muted">
              {trip.items.length} {trip.items.length === 1 ? 'item' : 'items'}
            </Badge>
            {expenseTotals?.byCurrency.map((c) => (
              <Badge key={c.currency} variant="muted">
                {formatMoney(c.total, c.currency)}
              </Badge>
            ))}
          </div>
        </div>
      </motion.article>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete trip"
        description="This will permanently delete the trip and all its items and expenses. This action cannot be undone."
        confirmLabel="Delete trip"
        cancelLabel="Cancel"
        destructive
        requiredInput={trip.title}
        onConfirm={async () => {
          setDeleteOpen(false);
          try {
            await removeTrip(trip.id);
            toast.success('Trip deleted');
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Delete failed';
            toast.error(`Couldn't delete trip: ${message}`);
          }
        }}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave this trip?"
        description="You'll lose access to this trip. If you have expense history, you'll be kept as a name-only entry so the splits and balances stay intact."
        confirmLabel="Leave trip"
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          setLeaveOpen(false);
          if (!myMembership) return;
          try {
            const result = await removeMember(trip.id, myMembership.id);
            toast.success(
              result.retired
                ? 'You left the trip — your expenses stay on it'
                : 'You left the trip',
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Leave failed';
            toast.error(`Couldn't leave trip: ${message}`);
          }
        }}
      />
    </>
  );
}
