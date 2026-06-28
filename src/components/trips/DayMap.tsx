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
import { Maximize2, Minimize2, MapPin } from 'lucide-react';
import { WishlistFilterControls } from './WishlistFilterControls';
import { AddToDaySheet, type AddToDayWish } from './AddToDaySheet';
import { useTrips } from '@/lib/trips/context';
import { useMapTheme } from '@/hooks/useMapTheme';
import { buildDayMapPoints, type DayMapPoint } from '@/lib/trips/dayMapPoints';
import {
  availableWishCategories,
  DEFAULT_WISHLIST_FILTER,
  filterDayMapPoints,
  type WishlistFilter,
} from '@/lib/trips/wishlistFilter';
import { isMapConfigured } from '@/lib/map/style';
import type { Trip, TripItem } from '@/lib/trips/types';

const DayMapCanvas = dynamic(
  () => import('@/components/map/DayMapCanvas').then((m) => m.DayMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="bg-secondary/30 absolute inset-0 animate-pulse" />
    ),
  },
);

interface DayMapProps {
  trip: Trip;
  dayKey: string;
  /** Opens the existing item detail sheet for scheduled/lodging pins. */
  onSelectItem: (item: TripItem) => void;
}

export function DayMap({ trip, dayKey, onSelectItem }: DayMapProps) {
  const { foodPlaces, activityPlaces, cityOverrides } = useTrips();
  const theme = useMapTheme();
  const tripId = trip.id;

  const [wishFilter, setWishFilter] = useState<WishlistFilter>(
    DEFAULT_WISHLIST_FILTER,
  );
  const [selectedWish, setSelectedWish] = useState<AddToDayWish | null>(null);
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
    () => filterDayMapPoints(points, wishFilter),
    [points, wishFilter],
  );

  const wishCategories = useMemo(
    () => availableWishCategories(points),
    [points],
  );

  const handleSelectPoint = useCallback(
    (point: DayMapPoint) => {
      if (point.kind === 'scheduled' || point.kind === 'lodging') {
        const item = trip.items.find((i) => i.id === point.itemId);
        if (item) onSelectItem(item);
        return;
      }
      setSelectedWish({
        kind: point.kind,
        label: point.label,
        address: point.address,
        lat: point.lat,
        lng: point.lng,
        placeId: point.placeId,
        wantLevel: point.wantLevel,
        nearestPlanMeters: point.nearestPlanMeters,
      });
    },
    [trip.items, onSelectItem],
  );

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

  const hasWishes =
    wishCategories.foodTotal > 0 || wishCategories.activityTotal > 0;

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
      {expanded && hasWishes && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="border-border/60 bg-background/80 pointer-events-auto w-[min(34rem,calc(100vw-2rem))] rounded-[var(--radius-lg)] border px-4 py-3 shadow-lg backdrop-blur-md">
            <WishlistFilterControls
              available={wishCategories}
              filter={wishFilter}
              onChange={setWishFilter}
            />
          </div>
        </div>
      )}
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
      <div className="mt-3 flex flex-col gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LegendDot className="bg-[var(--kind-activity)]" label="Plan" />
          <LegendDot className="bg-[var(--kind-lodging)]" label="Staying" />
          {unlocatedCount > 0 && (
            <span className="text-muted-foreground/70">
              {unlocatedCount}{' '}
              {unlocatedCount === 1 ? 'item has' : 'items have'} no location yet
            </span>
          )}
        </div>
        {hasWishes && (
          <WishlistFilterControls
            available={wishCategories}
            filter={wishFilter}
            onChange={setWishFilter}
          />
        )}
      </div>

      <AddToDaySheet
        wish={selectedWish}
        trip={trip}
        dayKey={dayKey}
        onOpenChange={(open) => {
          if (!open) setSelectedWish(null);
        }}
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
