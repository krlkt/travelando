'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  WishlistKindFilter,
  WishlistPlanFilter,
  WishlistSort,
} from '@/lib/trips/wishlistView';

interface CityOption {
  key: string;
  label: string;
}

interface WishlistFiltersProps {
  cities: CityOption[];
  /** The single active city — the wishlist is always scoped to one city. */
  cityKey: string;
  onCity: (cityKey: string) => void;
  kind: WishlistKindFilter;
  onKind: (kind: WishlistKindFilter) => void;
  planFilter: WishlistPlanFilter;
  onPlanFilter: (plan: WishlistPlanFilter) => void;
  sort: WishlistSort;
  onSort: (sort: WishlistSort) => void;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none',
        active
          ? 'border-foreground/20 bg-foreground text-background'
          : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border',
      )}
    >
      {children}
    </button>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground/60 w-12 shrink-0 text-[10px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
        {children}
      </div>
    </div>
  );
}

const KINDS: { value: WishlistKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'activity', label: 'Activities' },
];

const PLANS: { value: WishlistPlanFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unplanned', label: 'Not planned' },
  { value: 'planned', label: 'In plan' },
];

const SORTS: { value: WishlistSort; label: string }[] = [
  { value: 'want', label: 'Want level' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'Name' },
];

/**
 * Wishlist controls. The city is the primary axis: a forced single-city
 * selector sits at the top level. The secondary filters (type / status / sort)
 * are tucked into a disclosure that stays collapsed by default so they don't
 * crowd the list — a badge surfaces how many are active while hidden.
 */
export function WishlistFilters({
  cities,
  cityKey,
  onCity,
  kind,
  onKind,
  planFilter,
  onPlanFilter,
  sort,
  onSort,
}: WishlistFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (kind !== 'all' ? 1 : 0) +
    (planFilter !== 'all' ? 1 : 0) +
    (sort !== 'want' ? 1 : 0);

  return (
    <div className="flex flex-col gap-2">
      {cities.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {cities.map((c) => (
            <Chip
              key={c.key}
              active={cityKey === c.key}
              onClick={() => onCity(c.key)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="border-border/60 bg-card/60 rounded-[var(--radius-lg)] border">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="bg-foreground text-background grid size-4 place-items-center rounded-full text-[10px] font-semibold">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              'ml-auto size-3.5 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 flex flex-col gap-2 px-3 pt-1 pb-3">
            <ChipRow label="Type">
              {KINDS.map((k) => (
                <Chip
                  key={k.value}
                  active={kind === k.value}
                  onClick={() => onKind(k.value)}
                >
                  {k.label}
                </Chip>
              ))}
            </ChipRow>

            <ChipRow label="Status">
              {PLANS.map((p) => (
                <Chip
                  key={p.value}
                  active={planFilter === p.value}
                  onClick={() => onPlanFilter(p.value)}
                >
                  {p.label}
                </Chip>
              ))}
            </ChipRow>

            <ChipRow label="Sort">
              {SORTS.map((s) => (
                <Chip
                  key={s.value}
                  active={sort === s.value}
                  onClick={() => onSort(s.value)}
                >
                  {s.label}
                </Chip>
              ))}
            </ChipRow>
          </div>
        )}
      </div>
    </div>
  );
}
