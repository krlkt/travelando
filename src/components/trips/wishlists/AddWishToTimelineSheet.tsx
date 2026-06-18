'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Camera, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimeField } from '@/components/ui/TimeField';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet';
import { AddToDayTimeline } from '@/components/trips/AddToDayTimeline';
import { useTrips } from '@/lib/trips/context';
import { deriveCitiesByDay } from '@/lib/trips/cities';
import { dayScheduledItems } from '@/lib/trips/dayScheduledItems';
import { wishlistEntryToItemDraft } from '@/lib/trips/wishlistItemDraft';
import type { WishlistEntry } from '@/lib/trips/wishlistItems';
import type {
  CityOverride,
  ItemDraft,
  Trip,
  TripItem,
} from '@/lib/trips/types';
import { formatDate } from '@/lib/time/formatDate';
import { parseNaive, toNaiveString } from '@/lib/time/naive';
import {
  fromLocalInput,
  getTimePart,
  toLocalInput,
} from '@/lib/time/timeInput';
import { cn } from '@/lib/utils';

interface AddWishToTimelineSheetProps {
  tripId: string;
  /** The wishlist place being scheduled; `null` keeps the sheet closed. */
  entry: WishlistEntry | null;
  onOpenChange: (open: boolean) => void;
}

interface DayRef {
  key: string;
  date: Date;
}

const SLOT_GAP_MS = 60 * 60 * 1000;
const DEFAULT_START_HOUR = 10;

/** Next free start time on a day: an hour after the last stop, else 10:00. */
function nextSlotIso(dayKey: string, items: TripItem[]): string {
  const times = items
    .map((i) => parseNaive(i.startsAt).getTime())
    .filter((t) => Number.isFinite(t));
  if (times.length === 0) {
    const d = parseNaive(dayKey);
    d.setHours(DEFAULT_START_HOUR, 0, 0, 0);
    return toNaiveString(d);
  }
  return toNaiveString(new Date(Math.max(...times) + SLOT_GAP_MS));
}

function nextSlotTime(dayKey: string, items: TripItem[]): string {
  return getTimePart(toLocalInput(nextSlotIso(dayKey, items)));
}

/** Prefer the first day that sits in the entry's city; else the first day. */
function pickDefaultDayKey(
  days: DayRef[],
  entry: WishlistEntry,
  buckets: ReturnType<typeof deriveCitiesByDay>,
): string | null {
  const target = entry.cityPlaceId ?? entry.cityLabel;
  for (const day of days) {
    const bucket = buckets.get(day.key);
    if (!bucket) continue;
    const inCity = bucket.segments.some(
      (seg) => (seg.cityPlaceId ?? seg.cityLabel) === target,
    );
    if (inCity) return day.key;
  }
  return days[0]?.key ?? null;
}

/**
 * Schedules a wishlist place onto a chosen trip day. The user picks the day,
 * sees that day's existing stops via the shared {@link AddToDayTimeline}, sets
 * a time, and commits — reusing the same conversion the map's add-to-day flow
 * uses so the two stay in lockstep. Open/close lives here; the picker body is a
 * separate component keyed by entry id so it initializes fresh each time.
 */
export function AddWishToTimelineSheet({
  tripId,
  entry,
  onOpenChange,
}: AddWishToTimelineSheetProps) {
  const { getTrip, cityOverrides, addItem } = useTrips();
  const trip = getTrip(tripId);
  const overrides = useMemo(
    () => cityOverrides[tripId] ?? [],
    [cityOverrides, tripId],
  );

  return (
    <Sheet open={entry != null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {trip && entry && (
          <SchedulePicker
            key={entry.id}
            tripId={tripId}
            trip={trip}
            entry={entry}
            overrides={overrides}
            addItem={addItem}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SchedulePickerProps {
  tripId: string;
  trip: Trip;
  entry: WishlistEntry;
  overrides: CityOverride[];
  addItem: (tripId: string, draft: ItemDraft) => Promise<TripItem>;
  onClose: () => void;
}

function SchedulePicker({
  tripId,
  trip,
  entry,
  overrides,
  addItem,
  onClose,
}: SchedulePickerProps) {
  const buckets = useMemo(
    () => deriveCitiesByDay(trip, overrides),
    [trip, overrides],
  );
  const days = useMemo<DayRef[]>(
    () =>
      [...buckets.values()]
        .map((b) => ({ key: b.key, date: b.date }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [buckets],
  );

  // Initialized once on mount (the parent remounts this per entry via `key`).
  const [selectedDay, setSelectedDay] = useState<string | null>(() =>
    pickDefaultDayKey(days, entry, buckets),
  );
  const [time, setTime] = useState<string>(() => {
    const day = pickDefaultDayKey(days, entry, buckets);
    return day
      ? nextSlotTime(day, dayScheduledItems(trip, day, overrides))
      : '';
  });
  const [endTime, setEndTime] = useState('');
  const [adding, setAdding] = useState(false);

  const dayItems = useMemo<TripItem[]>(
    () => (selectedDay ? dayScheduledItems(trip, selectedDay, overrides) : []),
    [trip, selectedDay, overrides],
  );

  // Switching days re-seeds the start time to that day's next free slot.
  function selectDay(key: string) {
    setSelectedDay(key);
    setTime(nextSlotTime(key, dayScheduledItems(trip, key, overrides)));
    setEndTime('');
  }

  const isFood = entry.kind === 'food';
  const Icon = isFood ? UtensilsCrossed : Camera;

  async function handleAdd() {
    if (!selectedDay) return;

    const startsAt = time
      ? fromLocalInput(`${selectedDay}T${time}`)
      : nextSlotIso(selectedDay, dayItems);
    const endsAt = endTime
      ? fromLocalInput(`${selectedDay}T${endTime}`)
      : undefined;

    if (endsAt && parseNaive(endsAt) < parseNaive(startsAt)) {
      toast.error("End time can't be before the start.");
      return;
    }

    setAdding(true);
    try {
      await addItem(
        tripId,
        wishlistEntryToItemDraft(entry, { startsAt, endsAt }),
      );
      toast.success(`Added ${entry.name} to ${formatDate(selectedDay)}`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Add failed';
      toast.error(`Couldn't add to day: ${message}`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <SheetTitle className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <span className="truncate">{entry.name}</span>
      </SheetTitle>
      <SheetDescription>
        Pick a day to add this {isFood ? 'place' : 'stop'} to.
      </SheetDescription>

      <div className="grid gap-3 py-1">
        <div className="grid gap-1.5">
          <span className="text-muted-foreground/70 text-[11px] font-medium tracking-wide uppercase">
            Day
          </span>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {days.map((day) => {
              const active = day.key === selectedDay;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => selectDay(day.key)}
                  aria-pressed={active}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/70 text-muted-foreground hover:text-foreground hover:border-border',
                  )}
                >
                  {formatDate(day.date)}
                </button>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <AddToDayTimeline
            items={dayItems}
            proposed={{
              label: entry.name,
              kind: isFood ? 'meal' : 'activity',
              startsAt: time
                ? fromLocalInput(`${selectedDay}T${time}`)
                : undefined,
              endsAt: endTime
                ? fromLocalInput(`${selectedDay}T${endTime}`)
                : undefined,
            }}
          />
        )}

        <div className="flex gap-3">
          <div className="grid max-w-[8rem] gap-1.5">
            <Label>Start time</Label>
            <TimeField value={time} ariaLabel="Start time" onCommit={setTime} />
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
      </div>

      <SheetFooter>
        <SheetClose asChild>
          <Button variant="ghost">Cancel</Button>
        </SheetClose>
        <Button
          onClick={handleAdd}
          disabled={adding || !selectedDay}
          style={{
            background: isFood ? 'var(--kind-meal)' : 'var(--kind-activity)',
          }}
        >
          {adding ? 'Adding…' : 'Add to day'}
        </Button>
      </SheetFooter>
    </>
  );
}
