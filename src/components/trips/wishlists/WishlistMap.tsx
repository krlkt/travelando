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
import { useMapTheme } from '@/hooks/useMapTheme';
import { buildWishlistMapPoints } from '@/lib/trips/wishlistMapPoints';
import { isMapConfigured } from '@/lib/map/style';
import type { DayMapPoint } from '@/lib/trips/dayMapPoints';
import type { WishlistEntry } from '@/lib/trips/wishlistItems';

const DayMapCanvas = dynamic(
  () => import('@/components/map/DayMapCanvas').then((m) => m.DayMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="bg-secondary/30 absolute inset-0 animate-pulse" />
    ),
  },
);

interface WishlistMapProps {
  /** Wishlist places to plot — already filtered to the active city/kind. */
  entries: WishlistEntry[];
  /** Ids of entries already on the timeline, for the "in plan" marker badge. */
  plannedIds: ReadonlySet<string>;
  /** Opens the add-to-timeline card for the clicked pin's entry. */
  onSelect: (entry: WishlistEntry) => void;
}

/**
 * City wishlist map. Reuses the day map's `DayMapCanvas` renderer with only
 * wishlist pins — no route anchors, so no lines and no trip items are drawn.
 * Clicking a pin resolves it back to its `WishlistEntry` and opens the same
 * add-to-timeline card the list uses.
 *
 * The live map is portaled to <body> and stays mounted across expand/collapse
 * so MapLibre keeps its instance + viewport (mirrors DayMap).
 */
export function WishlistMap({
  entries,
  plannedIds,
  onSelect,
}: WishlistMapProps) {
  const theme = useMapTheme();
  const [expanded, setExpanded] = useState(false);

  const { points, unlocatedCount } = useMemo(
    () => buildWishlistMapPoints(entries, plannedIds),
    [entries, plannedIds],
  );

  // Resolve a clicked pin back to its source entry (pins key on `${kind}-${id}`,
  // and carry `placeRefId` = the entry id).
  const entryByRefId = useMemo(() => {
    const map = new Map<string, WishlistEntry>();
    for (const entry of entries) map.set(entry.id, entry);
    return map;
  }, [entries]);

  const placeholderRef = useRef<HTMLDivElement>(null);
  const [collapsedRect, setCollapsedRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Client-mount gate: false during SSR, true after hydration (keeps the portal
  // off the server render without a setState-in-effect).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Track the placeholder's document-space box so the collapsed map sits exactly
  // over it and scrolls with the page. Recompute on any reflow.
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

  const handleSelectPoint = useCallback(
    (point: DayMapPoint) => {
      if (point.kind !== 'foodWish' && point.kind !== 'activityWish') return;
      const entry = entryByRefId.get(point.placeRefId);
      if (entry) onSelect(entry);
    },
    [entryByRefId, onSelect],
  );

  if (!isMapConfigured()) {
    return (
      <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center">
        <MapPin className="text-muted-foreground/60 mb-3 size-6" />
        <p className="text-muted-foreground max-w-sm text-sm">
          The map isn&apos;t configured yet. Add a{' '}
          <code className="text-xs">NEXT_PUBLIC_MAPTILER_KEY</code> to see your
          wishlist laid out spatially.
        </p>
      </div>
    );
  }

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
        points={points}
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
    <div>
      {/* Reserves the in-column space; the live map is portaled on top of it. */}
      <div
        ref={placeholderRef}
        className="bg-secondary/20 h-[clamp(22rem,55vh,40rem)] w-full rounded-[var(--radius-lg)]"
      />
      {mounted && createPortal(mapSurface, document.body)}

      {points.length === 0 ? (
        <p className="text-muted-foreground/60 mt-3 text-xs">
          No places with a location to map yet.
        </p>
      ) : unlocatedCount > 0 ? (
        <p className="text-muted-foreground/70 mt-3 text-xs">
          {unlocatedCount} {unlocatedCount === 1 ? 'place has' : 'places have'}{' '}
          no location yet
        </p>
      ) : null}
    </div>
  );
}
