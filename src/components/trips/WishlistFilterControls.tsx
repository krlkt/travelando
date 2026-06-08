'use client';

import { useMemo } from 'react';
import {
  activityCategoryLabel,
  foodCategoryLabel,
} from '@/lib/trips/categoryLabels';
import type {
  AvailableWishCategories,
  WishKindFilter,
  WishlistFilter,
} from '@/lib/trips/wishlistFilter';
import type {
  ActivityPlaceCategory,
  FoodPlaceCategory,
} from '@/lib/trips/types';

interface WishlistFilterControlsProps {
  available: AvailableWishCategories;
  filter: WishlistFilter;
  onChange: (filter: WishlistFilter) => void;
}

const KIND_SEGMENTS: { value: WishKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'activity', label: 'Activity' },
];

/**
 * Toggles which wishlist pins the day map shows: a primary All/Food/Activity
 * segmented control plus a Hide affordance, and per-category chips that appear
 * only for categories present in the day. `null` category sets mean "all".
 */
export function WishlistFilterControls({
  available,
  filter,
  onChange,
}: WishlistFilterControlsProps) {
  const showFood = filter.kind === 'all' || filter.kind === 'food';
  const showActivity = filter.kind === 'all' || filter.kind === 'activity';

  const hidden = filter.kind === 'none';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Wishlist filter"
          className="border-border/60 bg-background/70 inline-flex items-center rounded-full border p-0.5 text-xs shadow-sm backdrop-blur-md"
        >
          {KIND_SEGMENTS.map((seg) => {
            const active = !hidden && filter.kind === seg.value;
            return (
              <button
                key={seg.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...filter, kind: seg.value })}
                className={`rounded-full px-3 py-1 transition ${
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-pressed={hidden}
          onClick={() => onChange({ ...filter, kind: hidden ? 'all' : 'none' })}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs underline-offset-2 hover:underline"
        >
          <span
            className={`size-2.5 rounded-full border border-dashed ${
              hidden
                ? 'border-muted-foreground/40'
                : 'border-[var(--kind-meal)] bg-[var(--kind-meal)]/20'
            }`}
          />
          {hidden ? 'Show' : 'Hide'}
        </button>
      </div>

      {!hidden && (
        <div className="flex flex-wrap items-center gap-1.5">
          {showFood && (
            <CategoryChips
              tint="var(--kind-meal)"
              categories={available.food}
              selected={filter.foodCategories}
              labelOf={foodCategoryLabel}
              onToggle={(next) => onChange({ ...filter, foodCategories: next })}
            />
          )}
          {showActivity && (
            <CategoryChips
              tint="var(--kind-activity)"
              categories={available.activity}
              selected={filter.activityCategories}
              labelOf={activityCategoryLabel}
              onToggle={(next) =>
                onChange({ ...filter, activityCategories: next })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

interface CategoryChipsProps<
  T extends FoodPlaceCategory | ActivityPlaceCategory,
> {
  tint: string;
  categories: { value: T; count: number }[];
  /** `null` means every category is selected (the default). */
  selected: ReadonlySet<T> | null;
  labelOf: (value: T) => string;
  /** Emits the next set, normalized to `null` when all categories are on. */
  onToggle: (next: ReadonlySet<T> | null) => void;
}

function CategoryChips<T extends FoodPlaceCategory | ActivityPlaceCategory>({
  tint,
  categories,
  selected,
  labelOf,
  onToggle,
}: CategoryChipsProps<T>) {
  const allValues = useMemo(() => categories.map((c) => c.value), [categories]);

  if (categories.length === 0) return null;

  const isSelected = (value: T): boolean =>
    selected === null || selected.has(value);

  const toggle = (value: T): void => {
    const base = selected ?? new Set(allValues);
    const next = new Set(base);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // Collapse back to `null` (the "all" default) when nothing is excluded.
    onToggle(next.size === allValues.length ? null : next);
  };

  return (
    <>
      {categories.map((c) => {
        const active = isSelected(c.value);
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(c.value)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
              active
                ? 'text-foreground'
                : 'text-muted-foreground/70 border-border/50 hover:text-foreground'
            }`}
            style={
              active
                ? {
                    borderColor: tint,
                    backgroundColor: `color-mix(in oklch, ${tint} 18%, transparent)`,
                  }
                : undefined
            }
          >
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: active ? tint : 'transparent',
                border: active ? undefined : `1px solid ${tint}`,
              }}
            />
            {labelOf(c.value)}
            <span className="text-muted-foreground/60 tabular-nums">
              {c.count}
            </span>
          </button>
        );
      })}
    </>
  );
}
