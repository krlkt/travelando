'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Camera, TriangleAlert, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimeField } from '@/components/ui/TimeField';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { WantLevel } from './WantLevel';
import { AddToDayTimeline } from './AddToDayTimeline';
import {
  OpenStatePill,
  PlacePhoto,
  PriceLevel,
  RatingBadge,
} from '@/components/places/PlaceDetailBits';
import { PlaceAddressLink } from '@/components/places/PlaceAddressLink';
import { useTrips } from '@/lib/trips/context';
import { usePlaceDetails } from '@/hooks/usePlaceDetails';
import { openStateAtWallTime, openStateNow } from '@/lib/places/openingHours';
import { dayScheduledItems } from '@/lib/trips/dayScheduledItems';
import { formatDistance, walkMinutes } from '@/lib/map/distance';
import {
  fromLocalInput,
  getTimePart,
  toLocalInput,
} from '@/lib/time/timeInput';
import { parseNaive, toNaiveString } from '@/lib/time/naive';
import type { ItemDraft, Trip, TripItem } from '@/lib/trips/types';

const SLOT_GAP_MS = 60 * 60 * 1000;
const DEFAULT_START_HOUR = 10;

/**
 * A wishlist place ready to be scheduled. Satisfied by both the map's wish
 * points and the wishlist-list places, so the same card opens from either
 * surface. Coordinates are optional — manual places resolve via address.
 */
export interface AddToDayWish {
  kind: 'foodWish' | 'activityWish';
  label: string;
  address?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  wantLevel?: number;
  /** Straight-line metres to the nearest scheduled/lodging anchor, if known. */
  nearestPlanMeters?: number;
}

/** Next free start time on the day: after the last scheduled stop, else 10:00. */
function nextSlotIso(dayKey: string, dayItems: TripItem[]): string {
  const times = dayItems
    .map((item) => parseNaive(item.startsAt).getTime())
    .filter((t) => Number.isFinite(t));

  if (times.length === 0) {
    const d = parseNaive(dayKey);
    d.setHours(DEFAULT_START_HOUR, 0, 0, 0);
    return toNaiveString(d);
  }
  return toNaiveString(new Date(Math.max(...times) + SLOT_GAP_MS));
}

/** Local `HH:MM` to prefill the add-to-day time field from the next free slot. */
function nextSlotTime(dayKey: string, dayItems: TripItem[]): string {
  return getTimePart(toLocalInput(nextSlotIso(dayKey, dayItems)));
}

interface AddToDaySheetProps {
  wish: AddToDayWish | null;
  trip: Trip;
  /** The day being scheduled — drives the slot prefill and conflict check. */
  dayKey: string;
  onOpenChange: (open: boolean) => void;
}

export function AddToDaySheet({
  wish,
  trip,
  dayKey,
  onOpenChange,
}: AddToDaySheetProps) {
  const { cityOverrides, addItem } = useTrips();
  const tripId = trip.id;

  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [adding, setAdding] = useState(false);

  const isWish = wish?.kind === 'foodWish' || wish?.kind === 'activityWish';
  const isFood = wish?.kind === 'foodWish';
  const Icon = isFood ? UtensilsCrossed : Camera;

  // The day's existing stops, in time order — shown compactly so the user can
  // see occupied windows, and used to prefill the next free slot.
  const dayItems = useMemo(
    () => dayScheduledItems(trip, dayKey, cityOverrides[tripId] ?? []),
    [trip, dayKey, cityOverrides, tripId],
  );

  // Prefill the start time with the next free slot whenever a new wish opens;
  // the user can still edit it before committing. Adjusting state during render
  // (React's "reset on prop change" pattern) avoids an effect + cascading render.
  const [lastWish, setLastWish] = useState(wish);
  if (wish !== lastWish) {
    setLastWish(wish);
    setTime(wish ? nextSlotTime(dayKey, dayItems) : '');
    setEndTime('');
  }

  // Stream in Google details (rating, price, hours, photo) for this place — the
  // same enrichment the wishlist surfaces. Skips cleanly for manual places.
  const { detail } = usePlaceDetails(isWish ? wish?.placeId : null);

  const openState = detail?.openingHours
    ? openStateNow(detail.openingHours, detail.utcOffsetMinutes)
    : 'unknown';

  // Warn (non-blocking) when the place looks closed at the chosen wall time.
  const conflict = useMemo(() => {
    if (!detail?.openingHours || !time) return false;
    const slot = parseNaive(fromLocalInput(`${dayKey}T${time}`));
    return openStateAtWallTime(detail.openingHours, slot) === 'closed';
  }, [detail, dayKey, time]);

  async function handleAdd() {
    if (!wish) return;

    // Honor the chosen time; fall back to the next free slot if it was cleared.
    const startsAt = time
      ? fromLocalInput(`${dayKey}T${time}`)
      : nextSlotIso(dayKey, dayItems);

    // End time is optional, but when set it must not precede the start.
    const endsAt = endTime ? fromLocalInput(`${dayKey}T${endTime}`) : undefined;
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      toast.error("End time can't be before the start.");
      return;
    }

    const draft: ItemDraft = {
      kind: wish.kind === 'foodWish' ? 'meal' : 'activity',
      title: wish.label,
      startsAt,
      endsAt,
      to: {
        label: wish.label,
        address: wish.address,
        lat: wish.lat,
        lng: wish.lng,
        placeId: wish.placeId,
      },
    };

    setAdding(true);
    try {
      await addItem(tripId, draft);
      toast.success(`Added ${wish.label} to this day`);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Add failed';
      toast.error(`Couldn't add to day: ${message}`);
    } finally {
      setAdding(false);
    }
  }

  const wantLevel = wish?.wantLevel;

  return (
    <Sheet open={isWish} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {isWish && wish && (
          <>
            <div className="flex items-start gap-3">
              <PlacePhoto
                photoName={detail?.photoName}
                sizeClass="size-14"
                dimPx={56}
              />
              <div className="min-w-0 flex-1">
                <SheetTitle className="flex items-center gap-2">
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate">{wish.label}</span>
                </SheetTitle>
                <SheetDescription>
                  {isFood ? 'Food wishlist' : 'Activity wishlist'}
                </SheetDescription>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <RatingBadge
                    rating={detail?.rating}
                    userRatingCount={detail?.userRatingCount}
                  />
                  <PriceLevel level={detail?.priceLevel} />
                  <OpenStatePill
                    openState={openState}
                    weekdayDescriptions={
                      detail?.openingHours?.weekdayDescriptions
                    }
                  />
                  {wantLevel ? (
                    <WantLevel
                      mode="indicator"
                      variant={isFood ? 'chili' : 'star'}
                      value={wantLevel}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 py-1">
              {wish.nearestPlanMeters != null && (
                <p className="text-muted-foreground text-sm">
                  {formatDistance(wish.nearestPlanMeters)} from your plan · ~
                  {walkMinutes(wish.nearestPlanMeters)} min walk
                </p>
              )}
              {wish.address && (
                <PlaceAddressLink
                  place={{
                    label: wish.label,
                    address: wish.address,
                    lat: wish.lat,
                    lng: wish.lng,
                    placeId: wish.placeId,
                  }}
                  className="text-muted-foreground text-sm"
                >
                  {wish.address}
                </PlaceAddressLink>
              )}

              <AddToDayTimeline
                items={dayItems}
                proposed={{
                  label: wish.label,
                  kind: isFood ? 'meal' : 'activity',
                  startsAt: time
                    ? fromLocalInput(`${dayKey}T${time}`)
                    : undefined,
                  endsAt: endTime
                    ? fromLocalInput(`${dayKey}T${endTime}`)
                    : undefined,
                }}
              />

              <div className="flex gap-3">
                <div className="grid max-w-[8rem] gap-1.5">
                  <Label>Start time</Label>
                  <TimeField
                    value={time}
                    ariaLabel="Start time"
                    onCommit={setTime}
                  />
                </div>
                <div className="grid max-w-[8rem] gap-1.5">
                  <Label>End time</Label>
                  <TimeField
                    value={endTime}
                    ariaLabel="End time"
                    onCommit={setEndTime}
                  />
                </div>
              </div>

              {conflict && (
                <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {wish.label} looks closed at this time. You can still add it
                    — double-check its opening hours.
                  </span>
                </div>
              )}
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button variant="ghost">Cancel</Button>
              </SheetClose>
              <Button
                onClick={handleAdd}
                disabled={adding}
                style={{
                  background: isFood
                    ? 'var(--kind-meal)'
                    : 'var(--kind-activity)',
                }}
              >
                {adding ? 'Adding…' : 'Add to this day'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
