'use client';

import { useMemo } from 'react';
import { convertToEur, type EurRates } from '@/lib/trips/fx';
import {
  EXPENSE_CATEGORIES,
  categoryAccents,
  categoryLabels,
} from '@/lib/trips/expenseCategory';
import { cn } from '@/lib/utils';
import type { Expense, ExpenseCategory } from '@/lib/trips/types';

interface CategoryWidgetProps {
  expenses: Expense[];
  rates: EurRates | null;
  selected: ExpenseCategory | null;
  onSelect: (category: ExpenseCategory | null) => void;
}

export function CategoryWidget({
  expenses,
  rates,
  selected,
  onSelect,
}: CategoryWidgetProps) {
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
    if (!rates) return totals;
    for (const e of expenses) {
      const eur = convertToEur(e.amount, e.currency, rates);
      if (eur === null) continue;
      totals[e.category] += eur;
    }
    return totals;
  }, [expenses, rates]);

  const grandTotal = useMemo(
    () => EXPENSE_CATEGORIES.reduce((s, c) => s + buckets[c], 0),
    [buckets],
  );

  return (
    <section
      aria-label="Expenses by category"
      className="border-border/70 bg-card mt-4 overflow-hidden rounded-[var(--radius-xl)] border p-3 shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_18px_42px_-24px_oklch(20%_0.02_250_/_0.18)] sm:p-4"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          By category
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
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
          const isActive = selected === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onSelect(isActive ? null : c)}
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
              <span className="font-display text-base tabular-nums">
                {rates ? `${pct}%` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
