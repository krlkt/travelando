'use client';

import type { MouseEvent } from 'react';
import { Navigation, Plus } from 'lucide-react';
import { openMapsLink } from '@/lib/places/maps-link';

interface LegActionsProps {
  originLabel: string;
  destinationLabel: string;
  /** Google Maps directions deep link, or null when the leg can't be routed. */
  directionsUrl?: string | null;
  /** Opens the editor pre-filled with a transport item for this leg. */
  onAddTransport?: () => void;
}

const buttonClass =
  'group/leg-btn text-muted-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:ring-ring/60 relative grid size-5 place-items-center rounded-full transition-[color,transform] hover:scale-110 focus-visible:ring-2 focus-visible:outline-none';

const labelClass =
  'bg-foreground text-background pointer-events-none absolute top-[calc(100%+0.3rem)] left-1/2 z-10 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap opacity-0 transition-opacity group-hover/leg-btn:opacity-100 group-focus-visible/leg-btn:opacity-100';

/**
 * The action cluster that sits on the connector rail between two stops. Holds a
 * directions link and/or a "quick-add transport" button in one capsule so the
 * two affordances never collide. Each control reveals its label on hover/focus;
 * icon-only by default keeps dense days uncluttered.
 */
export function LegActions({
  originLabel,
  destinationLabel,
  directionsUrl,
  onAddTransport,
}: LegActionsProps) {
  if (!directionsUrl && !onAddTransport) return null;

  function handleDirections(e: MouseEvent<HTMLAnchorElement>): void {
    e.stopPropagation();
    if (!directionsUrl) return;
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isMobile) {
      e.preventDefault();
      openMapsLink(directionsUrl);
    }
  }

  function handleAdd(e: MouseEvent<HTMLButtonElement>): void {
    e.stopPropagation();
    onAddTransport?.();
  }

  return (
    <div className="border-border bg-background pointer-events-auto inline-flex items-center gap-0.5 rounded-full border p-0.5 shadow-[0_6px_16px_-10px_oklch(20%_0.02_250_/_0.35)]">
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDirections}
          aria-label={`Directions from ${originLabel} to ${destinationLabel} in Google Maps`}
          className={buttonClass}
        >
          <Navigation className="size-2.5" strokeWidth={2.25} />
          <span className={labelClass}>Directions</span>
        </a>
      )}
      {directionsUrl && onAddTransport && (
        <span aria-hidden className="bg-border/70 h-3 w-px shrink-0" />
      )}
      {onAddTransport && (
        <button
          type="button"
          onClick={handleAdd}
          aria-label={`Add transport from ${originLabel} to ${destinationLabel}`}
          className={buttonClass}
        >
          <Plus className="size-3" strokeWidth={2.25} />
          <span className={labelClass}>Add transport</span>
        </button>
      )}
    </div>
  );
}
