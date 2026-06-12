'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Bed, Plus, Radio, Share2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineItem } from './TimelineItem';
import { DayHeader } from './DayHeader';
import { timelineGridClass, timelineIndentClass } from './timelineGrid';
import { useAuth } from '@/lib/auth/context';
import { findMemberIdForUser } from '@/lib/trips/balances';
import {
  buildItemExpenseTotals,
  type ItemExpenseTotal,
} from '@/lib/trips/itemExpenseTotals';
import { DayBackgroundStrip } from './DayBackgroundStrip';
import { DayFillDot } from './DayFillDot';
import { DayFinishedMark } from './DayFinishedMark';
import { ItemDetailSheet } from './ItemDetailSheet';
import { DayMap } from './DayMap';
import { FoodWishlist } from './FoodWishlist';
import { ActivityWishlist } from './ActivityWishlist';
import { CityOverrideSheet } from './CityOverrideSheet';
import { ItemEditorSheet } from './editor/ItemEditorSheet';
import { TripEditorSheet } from './editor/TripEditorSheet';
import { MembersSheet } from './MembersSheet';
import { useTrips } from '@/lib/trips/context';
import { usePersistedDay } from '@/hooks/usePersistedDay';
import { buildActiveDayKey } from '@/lib/trips/activeDayStorage';
import {
  findCurrentItem,
  findOverlappingItemIds,
  isBackgroundItem,
} from '@/lib/trips/grouping';
import {
  computeDayFillRatio,
  getDayFillLevel,
  type DayFillLevel,
} from '@/lib/trips/dayFill';
import {
  deriveCitiesByDay,
  lodgingForDay,
  lodgingWakeUpForDay,
} from '@/lib/trips/cities';
import {
  hotelLegGap,
  type LegGap,
  type TransportPrefill,
} from '@/lib/trips/legGap';
import { LegActions } from './LegActions';
import {
  formatDateRange,
  formatDate,
  formatShortDate,
  tripDayCount,
  isOngoing,
  isSameDay,
} from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type {
  CityOverride,
  DayCityBucket,
  Trip,
  TripItem,
} from '@/lib/trips/types';

interface TripDetailProps {
  tripId: string;
}

/** Hover explanation for the day-tab status dot, which is otherwise mute. */
const fillTitle: Record<DayFillLevel, string> = {
  empty: 'Nothing planned yet',
  light: 'Lightly planned',
  moderate: 'Partly planned',
  full: 'Packed day',
};

export function TripDetail({ tripId }: TripDetailProps) {
  const {
    getTrip,
    loadTripExtras,
    cityOverrides,
    dayPlans,
    toggleDayPlan,
    expenses,
  } = useTrips();
  const { user } = useAuth();
  const trip = getTrip(tripId);

  useEffect(() => {
    loadTripExtras(tripId);
  }, [tripId, loadTripExtras]);

  if (!trip) notFound();

  const now = new Date();
  const ongoing = isOngoing(trip.startDate, trip.endDate, now);
  const current = ongoing ? findCurrentItem(trip.items, now) : null;

  const dayCityBuckets = useMemo(() => {
    const map = deriveCitiesByDay(trip, cityOverrides[tripId] ?? []);
    return [...map.values()].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }, [trip, cityOverrides, tripId]);

  const doneDayKeys = useMemo(
    () => new Set((dayPlans[tripId] ?? []).map((p) => p.dayKey)),
    [dayPlans, tripId],
  );

  const defaultDay = useMemo(() => {
    if (current) {
      const found = dayCityBuckets.find((b) =>
        b.segments.some((s) => s.items.some((i) => i.id === current.id)),
      );
      if (found) return found.key;
    }
    return dayCityBuckets[0]?.key ?? '';
  }, [dayCityBuckets, current]);

  const validDayKeys = useMemo(
    () => dayCityBuckets.map((b) => b.key),
    [dayCityBuckets],
  );
  const [activeDay, setActiveDay] = usePersistedDay(
    buildActiveDayKey(tripId),
    defaultDay,
    validDayKeys,
  );
  const dayScrollRef = useRef<HTMLDivElement>(null);

  // Bring the active day tab into view within its horizontal strip (e.g. after
  // restoring a far-right day on a long trip). Scrolls only the strip, not the
  // page.
  useEffect(() => {
    const container = dayScrollRef.current;
    const active = container?.querySelector<HTMLElement>(
      '[data-state="active"]',
    );
    if (!container || !active) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const delta =
      activeRect.left -
      containerRect.left -
      (container.clientWidth - activeRect.width) / 2;
    container.scrollBy({ left: delta });
  }, [activeDay]);
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  const [defaultDayDate, setDefaultDayDate] = useState<Date | null>(null);
  const [itemPrefill, setItemPrefill] = useState<TransportPrefill | null>(null);
  const [cityOverrideOpen, setCityOverrideOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [view, setView] = useState<'timeline' | 'map'>('timeline');

  const activeBucket =
    dayCityBuckets.find((b) => b.key === activeDay) ?? dayCityBuckets[0];
  const activeBucketIdx = activeBucket
    ? dayCityBuckets.indexOf(activeBucket)
    : 0;
  const activeCityLabel =
    activeBucket?.segments[activeBucket.segments.length - 1]?.cityLabel ??
    trip.destination;
  const activeLodging = activeBucket
    ? lodgingForDay(trip, activeBucket.key)
    : null;
  const existingOverride: CityOverride | undefined = (
    cityOverrides[tripId] ?? []
  ).find((o) => o.dayKey === activeDay);

  const totalDays = tripDayCount(trip.startDate, trip.endDate);

  const itemExpenseTotals = useMemo(() => {
    const currentMemberId = findMemberIdForUser(trip.members, user?.id);
    return buildItemExpenseTotals(expenses[tripId] ?? [], currentMemberId);
  }, [expenses, tripId, trip.members, user?.id]);

  return (
    <div className="relative">
      {/* Cover */}
      <header
        className="relative w-full overflow-hidden"
        style={{ background: trip.coverGradient }}
      >
        <div
          aria-hidden
          className="grain absolute inset-0 opacity-40 mix-blend-overlay"
        />
        <div
          aria-hidden
          className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent"
        />

        <div className="relative mx-auto flex min-h-[16rem] max-w-[var(--container-page)] flex-col gap-6 px-4 pt-4 pb-12 sm:px-6 md:min-h-[20rem] md:px-10 md:pt-6 md:pb-16">
          <div className="flex items-center justify-between gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="bg-background/60 text-foreground hover:bg-background/80 backdrop-blur-md"
            >
              <Link href="/trips">
                <ArrowLeft className="size-4" />
                Trips
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="bg-background/80 backdrop-blur-md"
              >
                <Link href={`/trips/${trip.id}/now`}>
                  <Radio className="size-3.5" />
                  Live view
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="bg-background/60 backdrop-blur-md"
                aria-label="Members"
                onClick={() => setMembersOpen(true)}
              >
                <Share2 className="size-4" />
              </Button>
            </div>
          </div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger(0.05, 0.06)}
            className="text-background mt-auto min-w-0 drop-shadow-[0_2px_12px_oklch(15%_0.015_250_/_0.5)]"
          >
            <motion.div
              variants={fadeUp}
              className="text-[10px] tracking-[0.18em] uppercase opacity-90 sm:text-xs"
            >
              {trip.destination}
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display mt-1 text-[clamp(2.25rem,1rem+5vw,4.75rem)] leading-[1.05] tracking-tight break-words"
            >
              {trip.title}
            </motion.h1>
            <motion.div
              variants={fadeUp}
              className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-95 sm:text-sm"
            >
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              <span className="opacity-60">·</span>
              <span>
                {totalDays} {totalDays === 1 ? 'day' : 'days'}
              </span>
              {trip.members.length > 0 && (
                <>
                  <span className="opacity-60">·</span>
                  <button
                    type="button"
                    onClick={() => setMembersOpen(true)}
                    className="truncate text-left hover:underline"
                  >
                    {trip.members.map((m) => m.displayName).join(', ')}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-[var(--container-page)] px-4 pb-16 sm:px-6 md:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Timeline column */}
          <div className="min-w-0">
            <Tabs value={activeDay} onValueChange={setActiveDay}>
              {/* Day picker — sticky only as far as its own column */}
              <div className="bg-background/85 border-border/40 lg:backdrop-blur-0 sticky top-0 z-20 -mx-4 -mt-4 mb-2 border-b px-4 pt-3 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-16 md:-mx-10 md:-mt-6 md:px-10 lg:relative lg:top-auto lg:mx-0 lg:mt-0 lg:border-b-0 lg:bg-transparent lg:px-0 lg:pt-0">
                <div
                  ref={dayScrollRef}
                  className="no-scrollbar -mx-1 overflow-x-auto px-1"
                >
                  <TabsList className="w-max min-w-full justify-start">
                    {dayCityBuckets.map((bucket) => {
                      const allItems = bucket.segments.flatMap((s) => s.items);
                      const fillLevel = getDayFillLevel(
                        computeDayFillRatio(allItems, bucket.date),
                      );
                      const isDone = doneDayKeys.has(bucket.key);
                      const isToday = isSameDay(bucket.date, new Date());
                      const status = isDone
                        ? 'Marked planned'
                        : fillTitle[fillLevel];
                      return (
                        <TabsTrigger
                          key={bucket.key}
                          value={bucket.key}
                          data-done={isDone || undefined}
                          data-today={isToday || undefined}
                          title={`${formatDate(bucket.date)}${isToday ? ' · Today' : ''} · ${status}`}
                          className="data-[today]:ring-primary/45 shrink-0 px-2.5 data-[done]:text-emerald-600 data-[today]:ring-1 data-[today]:ring-inset sm:px-4 dark:data-[done]:text-emerald-400"
                        >
                          {isToday && (
                            <span
                              className="bg-primary mr-0.5 size-1.5 shrink-0 animate-pulse rounded-full"
                              aria-hidden
                            />
                          )}
                          <span className="sm:hidden">
                            {formatShortDate(bucket.date)}
                          </span>
                          <span className="hidden sm:inline">
                            {formatDate(bucket.date)}
                          </span>
                          {isDone ? (
                            <DayFinishedMark />
                          ) : (
                            <DayFillDot level={fillLevel} />
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              {/* Day anchor: number + date + meta + day-level controls */}
              {activeBucket && (
                <DayHeader
                  dayNumber={activeBucketIdx + 1}
                  date={activeBucket.date}
                  isToday={isSameDay(activeBucket.date, new Date())}
                  itemCount={activeBucket.segments.reduce(
                    (n, s) => n + s.items.length,
                    0,
                  )}
                  cityLabel={activeCityLabel}
                  onChangeCity={() => setCityOverrideOpen(true)}
                  lodging={activeLodging}
                  onSelectLodging={(item) => setSelectedItem(item)}
                  isDone={doneDayKeys.has(activeBucket.key)}
                  onToggleDone={() => toggleDayPlan(tripId, activeBucket.key)}
                  view={view}
                  onViewChange={setView}
                />
              )}

              {view === 'map' ? (
                <DayMap
                  trip={trip}
                  dayKey={activeDay}
                  onSelectItem={(item) => setSelectedItem(item)}
                />
              ) : (
                dayCityBuckets.map((bucket) => (
                  <TabsContent key={bucket.key} value={bucket.key}>
                    <DayContent
                      trip={trip}
                      bucket={bucket}
                      currentItemId={current?.id ?? null}
                      onSelect={(item) => setSelectedItem(item)}
                      onAdd={(dayDate) => {
                        setEditingItem(null);
                        setItemPrefill(null);
                        setDefaultDayDate(dayDate);
                        setItemEditorOpen(true);
                      }}
                      onAddTransport={(prefill, dayDate) => {
                        setEditingItem(null);
                        setDefaultDayDate(dayDate);
                        setItemPrefill(prefill);
                        setItemEditorOpen(true);
                      }}
                      itemExpenseTotals={itemExpenseTotals}
                    />
                  </TabsContent>
                ))
              )}
            </Tabs>
          </div>

          {/* Aside */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <FoodWishlist trip={trip} dayKey={activeDay} />
            <ActivityWishlist trip={trip} dayKey={activeDay} />
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <Link href={`/trips/${trip.id}/expenses`}>
                  <Wallet className="size-4" />
                  Expenses
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setTripEditorOpen(true)}>
                Edit trip
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <ItemDetailSheet
        trip={trip}
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(o) => {
          if (!o) setSelectedItem(null);
        }}
        onEdit={() => {
          setEditingItem(selectedItem);
          setSelectedItem(null);
          setItemEditorOpen(true);
        }}
      />

      <ItemEditorSheet
        trip={trip}
        item={editingItem}
        defaultDate={editingItem ? null : defaultDayDate}
        prefill={editingItem ? null : itemPrefill}
        open={itemEditorOpen}
        onOpenChange={(o) => {
          setItemEditorOpen(o);
          if (!o) {
            setEditingItem(null);
            setDefaultDayDate(null);
            setItemPrefill(null);
          }
        }}
      />

      <TripEditorSheet
        trip={trip}
        open={tripEditorOpen}
        onOpenChange={setTripEditorOpen}
      />

      <MembersSheet
        trip={trip}
        open={membersOpen}
        onOpenChange={setMembersOpen}
      />

      {activeBucket && (
        <CityOverrideSheet
          tripId={tripId}
          dayKey={activeDay}
          dayLabel={`Day ${activeBucketIdx + 1} · ${formatDate(activeBucket.date)}`}
          currentCity={activeCityLabel}
          existing={existingOverride}
          open={cityOverrideOpen}
          onOpenChange={setCityOverrideOpen}
        />
      )}
    </div>
  );
}

function DayContent({
  trip,
  bucket,
  currentItemId,
  onSelect,
  onAdd,
  onAddTransport,
  itemExpenseTotals,
}: {
  trip: Trip;
  bucket: DayCityBucket;
  currentItemId: string | null;
  onSelect: (item: TripItem) => void;
  onAdd: (dayDate: Date) => void;
  onAddTransport: (prefill: TransportPrefill, dayDate: Date) => void;
  itemExpenseTotals: Map<string, ItemExpenseTotal>;
}) {
  const partitionedSegments = bucket.segments.map((seg) => {
    const background: TripItem[] = [];
    const events: TripItem[] = [];
    for (const item of seg.items) {
      if (isBackgroundItem(item)) background.push(item);
      else events.push(item);
    }
    return {
      cityLabel: seg.cityLabel,
      background,
      events,
      overlappingIds: findOverlappingItemIds(events),
    };
  });
  const hasItems = partitionedSegments.some(
    (s) => s.background.length > 0 || s.events.length > 0,
  );
  const multiCity = bucket.segments.length > 1;
  const emptyCityLabel =
    bucket.segments[bucket.segments.length - 1]?.cityLabel ?? null;

  // Hotel "legs": the morning trip from where you woke up to the first stop, and
  // the night trip from the last stop back to where you sleep. Each only shows
  // when the hotel and the stop are genuinely different places.
  const dayEvents = partitionedSegments.flatMap((s) => s.events);
  const firstEvent = dayEvents[0];
  const lastEvent = dayEvents[dayEvents.length - 1];
  const wakeLodging = lodgingWakeUpForDay(trip, bucket.key);
  const nightLodging = lodgingForDay(trip, bucket.key);
  const departLeg =
    wakeLodging && firstEvent
      ? hotelLegGap(wakeLodging, firstEvent, 'depart')
      : null;
  const arriveLeg =
    nightLodging && lastEvent
      ? hotelLegGap(nightLodging, lastEvent, 'arrive')
      : null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={bucket.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="pt-4"
      >
        {!hasItems ? (
          <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center">
            <p className="text-muted-foreground max-w-sm text-sm">
              {emptyCityLabel
                ? `Nothing planned in ${emptyCityLabel} yet.`
                : 'Nothing planned for this day yet.'}{' '}
              Add a flight, a meal, a museum — whatever anchors the day.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => onAdd(bucket.date)}
            >
              <Plus className="size-4" />
              Add an item
            </Button>
          </div>
        ) : (
          <>
            {departLeg && wakeLodging && (
              <HotelLegRow
                leg={departLeg}
                hotelLabel={wakeLodging.title}
                direction="depart"
                dayDate={bucket.date}
                onAddTransport={onAddTransport}
              />
            )}
            {partitionedSegments.map((seg, segIdx) => (
              <div key={segIdx}>
                {multiCity && (
                  <div className="mt-4 mb-1 flex items-center gap-2 first:mt-2">
                    <span className="text-muted-foreground/60 text-[10px] tracking-[0.14em] uppercase">
                      {seg.cityLabel}
                    </span>
                    <span className="border-border/30 flex-1 border-t" />
                  </div>
                )}
                {seg.background.length > 0 && (
                  <DayBackgroundStrip
                    items={seg.background}
                    bucketDate={bucket.date}
                    onSelect={onSelect}
                  />
                )}
                {seg.events.length > 0 && (
                  <motion.ol
                    initial="hidden"
                    animate="show"
                    variants={stagger(0, 0.05)}
                    className={multiCity ? undefined : 'mt-2'}
                  >
                    {seg.events.map((item, idx) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isLast={idx === seg.events.length - 1}
                        isCurrent={item.id === currentItemId}
                        isOverlapping={seg.overlappingIds.has(item.id)}
                        bucketDate={bucket.date}
                        onSelect={() => onSelect(item)}
                        expenseTotal={itemExpenseTotals.get(item.id)}
                        nextItem={seg.events[idx + 1]}
                        onAddTransport={(prefill) =>
                          onAddTransport(prefill, bucket.date)
                        }
                      />
                    ))}
                  </motion.ol>
                )}
              </div>
            ))}
            {arriveLeg && nightLodging && (
              <HotelLegRow
                leg={arriveLeg}
                hotelLabel={nightLodging.title}
                direction="arrive"
                dayDate={bucket.date}
                onAddTransport={onAddTransport}
              />
            )}
            <div className={timelineIndentClass}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAdd(bucket.date)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-4" />
                Add to this day
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * A slim row bridging the day's lodging and its first/last stop. Mirrors the
 * timeline grid so the dashed hotel marker lands on the rail, then offers the
 * same directions + quick-add transport cluster as a between-stops leg. The
 * cluster is hover/focus-revealed on pointer devices, always visible on touch.
 */
function HotelLegRow({
  leg,
  hotelLabel,
  direction,
  dayDate,
  onAddTransport,
}: {
  leg: LegGap;
  hotelLabel: string;
  direction: 'depart' | 'arrive';
  dayDate: Date;
  onAddTransport: (prefill: TransportPrefill, dayDate: Date) => void;
}) {
  return (
    <div
      className={`group/hotel relative z-0 focus-within:z-30 hover:z-30 ${timelineGridClass}`}
    >
      <div aria-hidden />
      <div className="flex justify-center pt-1">
        <span className="border-border/70 text-muted-foreground/70 bg-background grid size-5 shrink-0 place-items-center rounded-full border border-dashed">
          <Bed className="size-3" />
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2 py-1">
        <span className="text-muted-foreground/70 min-w-0 truncate text-xs">
          {direction === 'depart'
            ? `Leave ${hotelLabel}`
            : `Back to ${hotelLabel}`}
        </span>
        <div className="transition-opacity duration-200 pointer-fine:opacity-0 pointer-fine:group-focus-within/hotel:opacity-100 pointer-fine:group-hover/hotel:opacity-100">
          <LegActions
            originLabel={leg.origin.label}
            destinationLabel={leg.destination.label}
            directionsUrl={leg.directionsUrl}
            onAddTransport={
              leg.prefill
                ? () => onAddTransport(leg.prefill!, dayDate)
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
