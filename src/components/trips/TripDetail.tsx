'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bed,
  CalendarDays,
  Map as MapIcon,
  MapPin,
  Plus,
  Radio,
  Share2,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineItem } from './TimelineItem';
import { useAuth } from '@/lib/auth/context';
import { findMemberIdForUser } from '@/lib/trips/balances';
import {
  buildItemExpenseTotals,
  type ItemExpenseTotal,
} from '@/lib/trips/itemExpenseTotals';
import { DayBackgroundStrip } from './DayBackgroundStrip';
import { DayFillDot } from './DayFillDot';
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
import { computeDayFillRatio, getDayFillLevel } from '@/lib/trips/dayFill';
import { deriveCitiesByDay, lodgingForDay } from '@/lib/trips/cities';
import {
  formatDateRange,
  formatDate,
  formatShortDate,
  tripDayCount,
  isOngoing,
} from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { CityOverride, DayCityBucket, TripItem } from '@/lib/trips/types';

interface TripDetailProps {
  tripId: string;
}

export function TripDetail({ tripId }: TripDetailProps) {
  const { getTrip, loadTripExtras, cityOverrides, expenses } = useTrips();
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
                    {dayCityBuckets.map((bucket, idx) => {
                      const allItems = bucket.segments.flatMap((s) => s.items);
                      const itemCount = allItems.length;
                      const fillLevel = getDayFillLevel(
                        computeDayFillRatio(allItems, bucket.date),
                      );
                      return (
                        <TabsTrigger
                          key={bucket.key}
                          value={bucket.key}
                          className="shrink-0 px-2.5 sm:px-4"
                        >
                          <span className="sm:hidden">
                            {formatShortDate(bucket.date.toISOString())}
                          </span>
                          <span className="hidden sm:inline">
                            {formatDate(bucket.date.toISOString())}
                          </span>
                          <DayFillDot level={fillLevel} />
                          {itemCount > 0 && (
                            <Badge
                              variant="muted"
                              className="ml-2 hidden sm:inline-flex"
                            >
                              {itemCount}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              {/* Day label + city + lodging indicator for active day */}
              {activeBucket && (
                <>
                  <div className="mt-1 mb-1">
                    <span className="text-muted-foreground/70 text-xs font-medium">
                      Day {activeBucketIdx + 1}
                    </span>
                    <span className="text-muted-foreground/40 mx-1.5 text-xs">
                      ·
                    </span>
                    <span className="text-muted-foreground/70 text-xs">
                      {formatDate(activeBucket.date.toISOString())}
                    </span>
                  </div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <MapPin className="text-muted-foreground/60 size-3 shrink-0" />
                      <span className="text-muted-foreground truncate text-xs">
                        {activeCityLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCityOverrideOpen(true)}
                        className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 text-[10px] underline-offset-2 hover:underline"
                      >
                        change
                      </button>
                    </div>
                    {activeLodging ? (
                      <button
                        type="button"
                        onClick={() => setSelectedItem(activeLodging)}
                        className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1.5 text-xs underline-offset-4 hover:underline"
                        title="Where you're staying tonight"
                      >
                        <Bed className="size-3 shrink-0 opacity-60" />
                        <span className="truncate">
                          {activeLodging.to?.label ?? activeLodging.title}
                        </span>
                      </button>
                    ) : (
                      <span className="text-muted-foreground/50 flex shrink-0 items-center gap-1.5 text-xs">
                        <Bed className="size-3 opacity-60" />
                        No lodging
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Timeline ⇄ Map view toggle */}
              <div className="border-border/60 bg-secondary/40 mt-1 inline-flex rounded-full border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setView('timeline')}
                  aria-pressed={view === 'timeline'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                    view === 'timeline'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarDays className="size-3.5" />
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setView('map')}
                  aria-pressed={view === 'map'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                    view === 'map'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapIcon className="size-3.5" />
                  Map
                </button>
              </div>

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
                      bucket={bucket}
                      currentItemId={current?.id ?? null}
                      onSelect={(item) => setSelectedItem(item)}
                      onAdd={(dayDate) => {
                        setEditingItem(null);
                        setDefaultDayDate(dayDate);
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
            <Button asChild variant="outline" className="w-full">
              <Link href={`/trips/${trip.id}/expenses`}>
                <Wallet className="size-4" />
                Expenses
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setTripEditorOpen(true)}
            >
              Edit trip details
            </Button>
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
        open={itemEditorOpen}
        onOpenChange={(o) => {
          setItemEditorOpen(o);
          if (!o) {
            setEditingItem(null);
            setDefaultDayDate(null);
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
          dayLabel={`Day ${activeBucketIdx + 1} · ${formatDate(activeBucket.date.toISOString())}`}
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
  bucket,
  currentItemId,
  onSelect,
  onAdd,
  itemExpenseTotals,
}: {
  bucket: DayCityBucket;
  currentItemId: string | null;
  onSelect: (item: TripItem) => void;
  onAdd: (dayDate: Date) => void;
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
              Nothing planned for this day. Add a flight, a meal, a museum —
              whatever anchors it.
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
                      />
                    ))}
                  </motion.ol>
                )}
              </div>
            ))}
            <div className="ml-[3.25rem] sm:ml-[4rem]">
              <Button
                variant="ghost"
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
