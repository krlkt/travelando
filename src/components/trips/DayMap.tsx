'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Camera,
  Maximize2,
  Minimize2,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
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
import { useTrips } from '@/lib/trips/context';
import { buildDayMapPoints, type DayMapPoint } from '@/lib/trips/dayMapPoints';
import { isMapConfigured, type MapTheme } from '@/lib/map/style';
import { formatDistance, walkMinutes } from '@/lib/map/distance';
import {
  fromLocalInput,
  getTimePart,
  toLocalInput,
} from '@/lib/time/timeInput';
import { PlaceAddressLink } from '@/components/places/PlaceAddressLink';
import type { ItemDraft, Trip, TripItem } from '@/lib/trips/types';

const DayMapCanvas = dynamic(
  () => import('@/components/map/DayMapCanvas').then((m) => m.DayMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="bg-secondary/30 absolute inset-0 animate-pulse" />
    ),
  },
);

const SLOT_GAP_MS = 60 * 60 * 1000;
const DEFAULT_START_HOUR = 10;

interface DayMapProps {
  trip: Trip;
  dayKey: string;
  /** Opens the existing item detail sheet for scheduled/lodging pins. */
  onSelectItem: (item: TripItem) => void;
}

function resolveTheme(): MapTheme {
  if (typeof document === 'undefined') return 'light';
  if (document.documentElement.classList.contains('dark')) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function useMapTheme(): MapTheme {
  // Lazy initializer resolves the theme up front (no setState-in-effect); the
  // effect only subscribes to later system-theme changes.
  const [theme, setTheme] = useState<MapTheme>(resolveTheme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(resolveTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return theme;
}

/** Next free start time on the day: after the last scheduled stop, else 10:00. */
function nextSlotIso(dayKey: string, scheduled: DayMapPoint[]): string {
  const times = scheduled
    .filter((p): p is Extract<DayMapPoint, { kind: 'scheduled' }> => {
      return p.kind === 'scheduled';
    })
    .map((p) => new Date(p.startsAt).getTime())
    .filter((t) => Number.isFinite(t));

  if (times.length === 0) {
    const d = new Date(`${dayKey}T00:00:00`);
    d.setHours(DEFAULT_START_HOUR, 0, 0, 0);
    return d.toISOString();
  }
  return new Date(Math.max(...times) + SLOT_GAP_MS).toISOString();
}

/** Local `HH:MM` to prefill the add-to-day time field from the next free slot. */
function nextSlotTime(dayKey: string, scheduled: DayMapPoint[]): string {
  return getTimePart(toLocalInput(nextSlotIso(dayKey, scheduled)));
}

export function DayMap({ trip, dayKey, onSelectItem }: DayMapProps) {
  const { foodPlaces, activityPlaces, cityOverrides, addItem } = useTrips();
  const theme = useMapTheme();
  const tripId = trip.id;

  const [showWishlist, setShowWishlist] = useState(true);
  const [selectedWish, setSelectedWish] = useState<DayMapPoint | null>(null);
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // The live map is portaled to <body> and stays mounted across expand/collapse
  // (no remount, so MapLibre keeps its instance + viewport). When collapsed it
  // is absolutely positioned over an in-column placeholder; when expanded it
  // covers the viewport. Portaling to <body> also frees `position: fixed` from
  // any ancestor transform/filter that would otherwise trap it to a sub-box.
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [collapsedRect, setCollapsedRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Client-mount gate: false during SSR, true after hydration. Avoids
  // setState-in-effect while keeping the portal off the server render.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Track the placeholder's document-space box so the collapsed map sits exactly
  // over it (and scrolls naturally with the page, since absolute boxes are
  // anchored to the document, not the viewport). Recompute on any reflow.
  useEffect(() => {
    if (!mounted) return;
    const measure = () => {
      const el = placeholderRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCollapsedRect({
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (placeholderRef.current) observer.observe(placeholderRef.current);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [mounted]);

  // While expanded, lock page scroll and let Escape collapse the map.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  const { points, unlocatedCount } = useMemo(
    () =>
      buildDayMapPoints(
        trip,
        dayKey,
        foodPlaces[tripId] ?? [],
        activityPlaces[tripId] ?? [],
        cityOverrides[tripId] ?? [],
      ),
    [trip, dayKey, foodPlaces, activityPlaces, cityOverrides, tripId],
  );

  const visiblePoints = useMemo(
    () =>
      showWishlist
        ? points
        : points.filter((p) => p.kind === 'scheduled' || p.kind === 'lodging'),
    [points, showWishlist],
  );

  const handleSelectPoint = useCallback(
    (point: DayMapPoint) => {
      if (point.kind === 'scheduled' || point.kind === 'lodging') {
        const item = trip.items.find((i) => i.id === point.itemId);
        if (item) onSelectItem(item);
        return;
      }
      // Prefill the time field with the next free slot, but let the user edit it
      // before adding instead of silently committing to that slot.
      setTime(nextSlotTime(dayKey, points));
      setEndTime('');
      setSelectedWish(point);
    },
    [trip.items, onSelectItem, dayKey, points],
  );

  const handleAddToDay = useCallback(async () => {
    if (!selectedWish) return;
    if (
      selectedWish.kind !== 'foodWish' &&
      selectedWish.kind !== 'activityWish'
    )
      return;

    // Honor the chosen time; fall back to the next free slot if it was cleared.
    const startsAt = time
      ? fromLocalInput(`${dayKey}T${time}`)
      : nextSlotIso(dayKey, points);

    // End time is optional, but when set it must not precede the start.
    const endsAt = endTime ? fromLocalInput(`${dayKey}T${endTime}`) : undefined;
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      toast.error("End time can't be before the start.");
      return;
    }

    const draft: ItemDraft = {
      kind: selectedWish.kind === 'foodWish' ? 'meal' : 'activity',
      title: selectedWish.label,
      startsAt,
      endsAt,
      to: {
        label: selectedWish.label,
        address: selectedWish.address,
        lat: selectedWish.lat,
        lng: selectedWish.lng,
        placeId: selectedWish.placeId,
      },
    };

    setAdding(true);
    try {
      await addItem(tripId, draft);
      toast.success(`Added ${selectedWish.label} to this day`);
      setSelectedWish(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Add failed';
      toast.error(`Couldn't add to day: ${message}`);
    } finally {
      setAdding(false);
    }
  }, [selectedWish, dayKey, points, time, endTime, addItem, tripId]);

  if (!isMapConfigured()) {
    return (
      <div className="border-border/70 bg-secondary/20 mt-4 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center">
        <MapPin className="text-muted-foreground/60 mb-3 size-6" />
        <p className="text-muted-foreground max-w-sm text-sm">
          The map isn&apos;t configured yet. Add a{' '}
          <code className="text-xs">NEXT_PUBLIC_MAPTILER_KEY</code> to see your
          lodging, plan, and wishlists laid out spatially.
        </p>
      </div>
    );
  }

  const wishCounts = points.reduce(
    (acc, p) => {
      if (p.kind === 'foodWish') acc.food += 1;
      if (p.kind === 'activityWish') acc.activity += 1;
      return acc;
    },
    { food: 0, activity: 0 },
  );

  const surfaceStyle: CSSProperties = expanded
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 40,
      }
    : collapsedRect
      ? {
          position: 'absolute',
          top: collapsedRect.top,
          left: collapsedRect.left,
          width: collapsedRect.width,
          height: collapsedRect.height,
        }
      : { display: 'none' };

  const mapSurface = (
    <div
      style={surfaceStyle}
      className={`border-border/60 relative overflow-hidden ${
        expanded ? 'rounded-none border-0' : 'rounded-[var(--radius-lg)] border'
      }`}
    >
      <DayMapCanvas
        points={visiblePoints}
        theme={theme}
        onSelectPoint={handleSelectPoint}
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-pressed={expanded}
        aria-label={expanded ? 'Exit full screen' : 'Expand map'}
        className="border-border/60 bg-background/70 text-foreground hover:bg-background/90 absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs shadow-sm backdrop-blur-md transition"
      >
        {expanded ? (
          <Minimize2 className="size-3.5" />
        ) : (
          <Maximize2 className="size-3.5" />
        )}
        {expanded ? 'Exit' : 'Expand'}
      </button>
    </div>
  );

  return (
    <div className="mt-4">
      {/* Reserves the in-column space; the live map is portaled on top of it. */}
      <div
        ref={placeholderRef}
        className="bg-secondary/20 h-[clamp(22rem,55vh,40rem)] w-full rounded-[var(--radius-lg)]"
      />
      {mounted && createPortal(mapSurface, document.body)}

      {/* Legend + controls */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <LegendDot className="bg-[var(--kind-activity)]" label="Plan" />
        <LegendDot className="bg-[var(--kind-lodging)]" label="Staying" />
        {(wishCounts.food > 0 || wishCounts.activity > 0) && (
          <button
            type="button"
            onClick={() => setShowWishlist((v) => !v)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
            aria-pressed={showWishlist}
          >
            <span
              className={`size-2.5 rounded-full border border-dashed ${showWishlist ? 'border-[var(--kind-meal)] bg-[var(--kind-meal)]/20' : 'border-muted-foreground/40'}`}
            />
            {showWishlist ? 'Hide' : 'Show'} wishlists ({wishCounts.food} food ·{' '}
            {wishCounts.activity} activity)
          </button>
        )}
        {unlocatedCount > 0 && (
          <span className="text-muted-foreground/70">
            {unlocatedCount} {unlocatedCount === 1 ? 'item has' : 'items have'}{' '}
            no location yet
          </span>
        )}
      </div>

      <AddToDaySheet
        wish={selectedWish}
        time={time}
        onTimeChange={setTime}
        endTime={endTime}
        onEndTimeChange={setEndTime}
        adding={adding}
        onOpenChange={(open) => {
          if (!open) setSelectedWish(null);
        }}
        onAdd={handleAddToDay}
      />
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

interface AddToDaySheetProps {
  wish: DayMapPoint | null;
  time: string;
  onTimeChange: (time: string) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  adding: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
}

function AddToDaySheet({
  wish,
  time,
  onTimeChange,
  endTime,
  onEndTimeChange,
  adding,
  onOpenChange,
  onAdd,
}: AddToDaySheetProps) {
  const isWish = wish?.kind === 'foodWish' || wish?.kind === 'activityWish';
  const Icon = wish?.kind === 'foodWish' ? UtensilsCrossed : Camera;

  return (
    <Sheet open={isWish} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {isWish && wish && (
          <>
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Icon className="text-muted-foreground size-4" />
                {wish.label}
              </SheetTitle>
              <SheetDescription>
                {wish.kind === 'foodWish'
                  ? 'Food wishlist'
                  : 'Activity wishlist'}
              </SheetDescription>
            </div>

            <div className="grid gap-3 py-1">
              {'nearestPlanMeters' in wish &&
                wish.nearestPlanMeters != null && (
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
              {'wantLevel' in wish && wish.wantLevel ? (
                <WantLevel
                  mode="indicator"
                  variant="star"
                  value={wish.wantLevel}
                />
              ) : null}

              <div className="flex gap-3">
                <div className="grid max-w-[8rem] gap-1.5">
                  <Label>Start time</Label>
                  <TimeField
                    value={time}
                    ariaLabel="Start time"
                    onCommit={onTimeChange}
                  />
                </div>
                <div className="grid max-w-[8rem] gap-1.5">
                  <Label>End time</Label>
                  <TimeField
                    value={endTime}
                    ariaLabel="End time"
                    onCommit={onEndTimeChange}
                  />
                </div>
              </div>
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button variant="ghost">Cancel</Button>
              </SheetClose>
              <Button
                onClick={onAdd}
                disabled={adding}
                style={{
                  background:
                    wish.kind === 'foodWish'
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
