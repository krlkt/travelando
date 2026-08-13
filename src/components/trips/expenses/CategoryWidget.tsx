'use client';

import { useMemo } from 'react';
import { type EurRates } from '@/lib/trips/fx';
import {
  EXPENSE_CATEGORIES,
  categoryAccents,
  categoryLabels,
} from '@/lib/trips/expenseCategory';
import { aggregateByCategory } from '@/lib/trips/expenseTotals';
import { cn } from '@/lib/utils';
import type { Expense, ExpenseCategory } from '@/lib/trips/types';

// Compact whole-euro format keeps category tiles tight even with large,
// multi-currency totals (e.g. "€12,346").
const eurCompact = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

interface CategoryWidgetProps {
  expenses: Expense[];
  rates: EurRates | null;
  /** Focused member whose share is shown; `null` = trip total. */
  focusMemberId: string | null;
  /** Possessive scope word for the heading, e.g. "Your", "Trip", "Alex's". */
  scopeName: string;
  /** Active categories. Empty means no category filter. */
  selected: ExpenseCategory[];
  onToggle: (category: ExpenseCategory) => void;
  onClear: () => void;
}

export function CategoryWidget({
  expenses,
  rates,
  focusMemberId,
  scopeName,
  selected,
  onToggle,
  onClear,
}: CategoryWidgetProps) {
  const categoryTotals = useMemo(
    () => aggregateByCategory(expenses, rates, focusMemberId),
    [expenses, rates, focusMemberId],
  );

  const buckets = useMemo(() => {
    const totals: Record<ExpenseCategory, number> = {
      accommodation: 0,
      entertainment: 0,
      groceries: 0,
      restaurants: 0,
      shopping: 0,
      transport: 0,
      other: 0,
    };
    for (const c of EXPENSE_CATEGORIES) {
      totals[c] = focusMemberId
        ? categoryTotals[c].mine
        : categoryTotals[c].total;
    }
    return totals;
  }, [categoryTotals, focusMemberId]);

  const grandTotal = useMemo(
    () => EXPENSE_CATEGORIES.reduce((s, c) => s + buckets[c], 0),
    [buckets],
  );

  // Buckets are normalised to EUR, so the displayed sums are exact only when
  // every expense is already in EUR; otherwise they are converted approximations.
  const hasForeign = useMemo(
    () => expenses.some((e) => e.currency.toUpperCase() !== 'EUR'),
    [expenses],
  );

  return (
    <section
      aria-label="Expenses by category"
      className="border-border/70 bg-card mt-4 overflow-hidden rounded-[var(--radius-xl)] border p-3 shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_18px_42px_-24px_oklch(20%_0.02_250_/_0.18)] sm:p-4"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          {`${scopeName} spend by category`}
          {selected.length > 0 && (
            <span className="ml-1.5 normal-case opacity-70">
              · {selected.length} selected
            </span>
          )}
          {hasForeign && (
            <span className="ml-1.5 normal-case opacity-70">≈ EUR</span>
          )}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {EXPENSE_CATEGORIES.map((c) => {
          const amount = buckets[c];
          const pct =
            grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
          const isActive = selected.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onToggle(c)}
              aria-pressed={isActive}
              className={cn(
                'border-border/60 group flex flex-col gap-1 rounded-[var(--radius)] border p-2.5 text-left transition',
                isActive
                  ? 'border-foreground/30 bg-secondary'
                  : 'bg-background/40 hover:bg-secondary/40',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: categoryAccents[c] }}
                />
                <span className="truncate text-[11px] tracking-[0.06em] uppercase">
                  {categoryLabels[c]}
                </span>
              </span>
              <div className="flex items-baseline justify-between gap-1.5">
                <span className="font-display truncate text-base tabular-nums">
                  {rates ? eurCompact.format(amount) : '—'}
                </span>
                {rates && (
                  <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
