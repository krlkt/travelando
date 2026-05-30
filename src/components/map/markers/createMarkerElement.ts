import type { DayMapPoint } from '@/lib/trips/dayMapPoints';
import type { ItemKind } from '@/lib/trips/types';
import { WALKABLE_THRESHOLD_M } from '@/lib/map/distance';

// Minimal inline SVG glyphs (lucide-derived paths) — markers are imperative DOM
// elements managed by MapLibre, so we can't mount React/lucide components here.
const GLYPH = {
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  utensils:
    '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
} as const;

function svg(paths: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function accentVar(kind: ItemKind): string {
  switch (kind) {
    case 'meal':
      return 'var(--kind-meal)';
    case 'transport':
      return 'var(--kind-transport)';
    case 'lodging':
      return 'var(--kind-lodging)';
    case 'note':
      return 'var(--kind-note)';
    case 'activity':
    default:
      return 'var(--kind-activity)';
  }
}

function wantDots(level: number | undefined): string {
  if (!level || level < 1) return '';
  const dots = Array.from({ length: Math.min(level, 5) }, () => '<i></i>').join(
    '',
  );
  return `<span class="dm-marker__want">${dots}</span>`;
}

/**
 * Builds the DOM element for a single map marker. The visual encodes the point
 * kind: lodging is an anchored bed pin, scheduled points are numbered route
 * stops colored by item kind, and wishlist points are dashed "ghost" markers
 * weighted by want-level.
 *
 * The root button is what MapLibre positions (it owns the inline `transform`),
 * so it must stay transform-free. All hover/scale/lift motion lives on the
 * inner `.dm-marker__inner` wrapper to avoid animating MapLibre's repositioning.
 */
export function createMarkerElement(point: DayMapPoint): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `dm-marker dm-marker--${point.kind}`;
  // Wishlist places beyond a comfortable walk of the plan recede visually.
  if (
    (point.kind === 'foodWish' || point.kind === 'activityWish') &&
    point.nearestPlanMeters != null &&
    point.nearestPlanMeters > WALKABLE_THRESHOLD_M
  ) {
    el.classList.add('dm-marker--far');
  }
  el.setAttribute('aria-label', markerLabel(point));
  el.title = point.label;

  let inner = '';
  switch (point.kind) {
    case 'lodging':
      el.style.setProperty('--dm-accent', 'var(--kind-lodging)');
      inner = `<span class="dm-marker__pin">${svg(GLYPH.bed)}</span>`;
      break;
    case 'scheduled':
      el.style.setProperty('--dm-accent', accentVar(point.itemKind));
      if (point.endpoint) el.classList.add(`dm-marker--${point.endpoint}`);
      inner = `<span class="dm-marker__pin dm-marker__pin--num">${point.order}</span>`;
      break;
    case 'foodWish':
      el.style.setProperty('--dm-accent', 'var(--kind-meal)');
      inner = `<span class="dm-marker__pin dm-marker__pin--ghost">${svg(GLYPH.utensils)}</span>${wantDots(point.wantLevel)}`;
      break;
    case 'activityWish':
      el.style.setProperty('--dm-accent', 'var(--kind-activity)');
      inner = `<span class="dm-marker__pin dm-marker__pin--ghost">${svg(GLYPH.camera)}</span>${wantDots(point.wantLevel)}`;
      break;
  }

  el.innerHTML = `<span class="dm-marker__inner">${inner}</span>`;
  return el;
}

function markerLabel(point: DayMapPoint): string {
  switch (point.kind) {
    case 'lodging':
      return `Staying at ${point.label}`;
    case 'scheduled':
      if (point.endpoint === 'depart')
        return `Stop ${point.order}: depart from ${point.label}`;
      if (point.endpoint === 'arrive')
        return `Stop ${point.order}: arrive at ${point.label}`;
      return `Stop ${point.order}: ${point.label}`;
    case 'foodWish':
      return `Food wishlist: ${point.label}`;
    case 'activityWish':
      return `Activity wishlist: ${point.label}`;
  }
}
