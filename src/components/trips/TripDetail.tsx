'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, MapPin, Plus, Radio, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineItem } from './TimelineItem';
import { ItemDetailSheet } from './ItemDetailSheet';
import { ExpensesPanel } from './ExpensesPanel';
import { FoodWishlist } from './FoodWishlist';
import { CityOverrideSheet } from './CityOverrideSheet';
import { ItemEditorSheet } from './editor/ItemEditorSheet';
import { TripEditorSheet } from './editor/TripEditorSheet';
import { useTrips } from '@/lib/trips/context';
import { findCurrentItem } from '@/lib/trips/grouping';
import { cityForDay, deriveCitiesByDay } from '@/lib/trips/cities';
import {
  formatDateRange,
  formatDate,
  tripDayCount,
  isOngoing,
} from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { CityOverride, DayCityBucket, TripItem } from '@/lib/trips/types';

interface TripDetailProps {
  tripId: string;
}

export function TripDetail({ tripId }: TripDetailProps) {
  const { getTrip, loadTripExtras, cityOverrides } = useTrips();
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

  const [activeDay, setActiveDay] = useState(defaultDay);
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null);
  const [itemEditorOpen, setItemEditorOpen] = useState(false);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  const [defaultDayDate, setDefaultDayDate] = useState<Date | null>(null);
  const [cityOverrideOpen, setCityOverrideOpen] = useState(false);

  const activeBucket =
    dayCityBuckets.find((b) => b.key === activeDay) ?? dayCityBuckets[0];
  const activeBucketIdx = activeBucket
    ? dayCityBuckets.indexOf(activeBucket)
    : 0;
  const activeCityLabel =
    activeBucket?.segments[0]?.cityLabel ?? trip.destination;
  const existingOverride: CityOverride | undefined = (
    cityOverrides[tripId] ?? []
  ).find((o) => o.dayKey === activeDay);

  const totalDays = tripDayCount(trip.startDate, trip.endDate);

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
              {ongoing && (
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
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                className="bg-background/60 backdrop-blur-md"
                aria-label="Share"
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
              {trip.travelers.length > 0 && (
                <>
                  <span className="opacity-60">·</span>
                  <span className="truncate">{trip.travelers.join(', ')}</span>
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
                <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
                  <TabsList className="w-max min-w-full justify-start">
                    {dayCityBuckets.map((bucket, idx) => {
                      const itemCount = bucket.segments.reduce(
                        (sum, s) => sum + s.items.length,
                        0,
                      );
                      return (
                        <TabsTrigger
                          key={bucket.key}
                          value={bucket.key}
                          className="shrink-0"
                        >
                          <span className="text-muted-foreground/80 mr-2 text-[10px] tracking-[0.14em] uppercase">
                            Day {idx + 1}
                          </span>
                          {formatDate(bucket.date.toISOString())}
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

              {/* City indicator for active day */}
              {activeBucket && (
                <div className="mb-2 flex items-center gap-1.5">
                  <MapPin className="text-muted-foreground/60 size-3" />
                  <span className="text-muted-foreground text-xs">
                    {activeCityLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCityOverrideOpen(true)}
                    className="text-muted-foreground/50 hover:text-muted-foreground text-[10px] underline-offset-2 hover:underline"
                  >
                    change
                  </button>
                </div>
              )}

              {dayCityBuckets.map((bucket) => (
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
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Aside */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <ExpensesPanel trip={trip} />
            <FoodWishlist trip={trip} />
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
}: {
  bucket: DayCityBucket;
  currentItemId: string | null;
  onSelect: (item: TripItem) => void;
  onAdd: (dayDate: Date) => void;
}) {
  const hasItems = bucket.segments.some((s) => s.items.length > 0);
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
            {bucket.segments.map((seg, segIdx) => (
              <div key={segIdx}>
                {multiCity && (
                  <div className="mt-4 mb-1 flex items-center gap-2 first:mt-2">
                    <span className="text-muted-foreground/60 text-[10px] tracking-[0.14em] uppercase">
                      {seg.cityLabel}
                    </span>
                    <span className="border-border/30 flex-1 border-t" />
                  </div>
                )}
                {seg.items.length > 0 && (
                  <motion.ol
                    initial="hidden"
                    animate="show"
                    variants={stagger(0, 0.05)}
                    className={multiCity ? undefined : 'mt-2'}
                  >
                    {seg.items.map((item, idx) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        isLast={idx === seg.items.length - 1}
                        isCurrent={item.id === currentItemId}
                        onSelect={() => onSelect(item)}
                      />
                    ))}
                  </motion.ol>
                )}
              </div>
            ))}
            <div className="ml-[3.75rem] sm:ml-[4.5rem]">
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
