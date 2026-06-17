import type { DayMapPoint } from '@/lib/trips/dayMapPoints';
import type { ItemKind } from '@/lib/trips/types';
import { WALKABLE_THRESHOLD_M } from '@/lib/map/distance';
import { activityCategoryGlyph, foodCategoryGlyph } from './categoryGlyphs';

// Minimal inline SVG glyphs (lucide-derived paths) — markers are imperative DOM
// elements managed by MapLibre, so we can't mount React/lucide components here.
// Per-category wishlist glyphs live in `categoryGlyphs.ts`; this only keeps the
// glyph used by the lodging anchor.
const GLYPH = {
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  // lucide: check
  check: '<path d="M20 6 9 17l-5-5"/>',
} as const;

function svg(paths: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/** Small "in plan" badge overlaid on a wishlist marker already on the route. */
function inPlanBadge(): string {
  return `<span class="dm-marker__check">${svg(GLYPH.check)}</span>`;
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
      if (point.inPlan) el.classList.add('dm-marker--in-plan');
      inner = `<span class="dm-marker__pin dm-marker__pin--ghost">${svg(foodCategoryGlyph(point.category))}</span>${point.inPlan ? inPlanBadge() : ''}${wantDots(point.wantLevel)}`;
      break;
    case 'activityWish':
      el.style.setProperty('--dm-accent', 'var(--kind-activity)');
      if (point.inPlan) el.classList.add('dm-marker--in-plan');
      inner = `<span class="dm-marker__pin dm-marker__pin--ghost">${svg(activityCategoryGlyph(point.category))}</span>${point.inPlan ? inPlanBadge() : ''}${wantDots(point.wantLevel)}`;
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
      return `Food wishlist: ${point.label}${point.inPlan ? ' — already in your plan' : ''}`;
    case 'activityWish':
      return `Activity wishlist: ${point.label}${point.inPlan ? ' — already in your plan' : ''}`;
  }
}
