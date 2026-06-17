import type {
  WishlistCategory,
  WishlistEntry,
  WishlistKind,
} from './wishlistItems';

/** Stable city key for grouping/filtering — place id when present, else label. */
export function entryCityKey(entry: WishlistEntry): string {
  return entry.cityPlaceId ?? entry.cityLabel;
}

export type WishlistKindFilter = 'all' | WishlistKind;
export type WishlistPlanFilter = 'all' | 'planned' | 'unplanned';
export type WishlistSort = 'want' | 'rating' | 'name';

export interface WishlistViewOptions {
  kind: WishlistKindFilter;
  /** `null` means all categories; an empty set hides everything. */
  categories: ReadonlySet<WishlistCategory> | null;
  /** `null` means all cities. */
  cityKey: string | null;
  /** Minimum want level (1–5); `0` keeps unrated and all levels. */
  minWantLevel: number;
  planFilter: WishlistPlanFilter;
  sort: WishlistSort;
  /** Entry ids already represented by a timeline item. */
  plannedIds: ReadonlySet<string>;
  /** Google rating per entry id, when loaded — drives the rating sort. */
  ratingById: ReadonlyMap<string, number>;
}

export const DEFAULT_WISHLIST_VIEW: Omit<
  WishlistViewOptions,
  'plannedIds' | 'ratingById'
> = {
  kind: 'all',
  categories: null,
  cityKey: null,
  minWantLevel: 0,
  planFilter: 'all',
  sort: 'want',
};

function passesFilters(
  entry: WishlistEntry,
  opts: WishlistViewOptions,
): boolean {
  if (opts.kind !== 'all' && entry.kind !== opts.kind) return false;
  if (opts.cityKey != null && entryCityKey(entry) !== opts.cityKey)
    return false;
  if (opts.minWantLevel > 0 && (entry.wantLevel ?? 0) < opts.minWantLevel) {
    return false;
  }
  if (opts.categories != null) {
    const category = entry.category ?? 'other';
    if (!opts.categories.has(category)) return false;
  }
  if (opts.planFilter !== 'all') {
    const planned = opts.plannedIds.has(entry.id);
    if (opts.planFilter === 'planned' && !planned) return false;
    if (opts.planFilter === 'unplanned' && planned) return false;
  }
  return true;
}

function compare(
  a: WishlistEntry,
  b: WishlistEntry,
  opts: WishlistViewOptions,
): number {
  switch (opts.sort) {
    case 'rating': {
      const ra = opts.ratingById.get(a.id) ?? -1;
      const rb = opts.ratingById.get(b.id) ?? -1;
      if (ra !== rb) return rb - ra;
      return a.name.localeCompare(b.name);
    }
    case 'name':
      return a.name.localeCompare(b.name);
    case 'want':
    default: {
      const wa = a.wantLevel ?? 0;
      const wb = b.wantLevel ?? 0;
      if (wa !== wb) return wb - wa;
      return a.name.localeCompare(b.name);
    }
  }
}

/**
 * Filters and sorts unified wishlist entries for the dedicated page. Pure:
 * planned/rating signals are injected so the function stays testable without a
 * network or the trip timeline.
 */
export function filterAndSortWishlist(
  entries: readonly WishlistEntry[],
  opts: WishlistViewOptions,
): WishlistEntry[] {
  return entries
    .filter((entry) => passesFilters(entry, opts))
    .sort((a, b) => compare(a, b, opts));
}
