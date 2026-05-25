'use client';

import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { kindMeta } from '@/lib/trips/kindMeta';
import {
  formatMoney,
  totalsByCategory,
  totalsByCurrency,
} from '@/lib/trips/grouping';
import type { Trip } from '@/lib/trips/types';

export function ExpensesPanel({ trip }: { trip: Trip }) {
  const byCurrency = totalsByCurrency(trip.items);
  const byCategory = totalsByCategory(trip.items);

  const categories = Array.from(byCategory.entries());
  const primaryCurrency = [...byCurrency.keys()][0];
  const totalForPrimary = primaryCurrency
    ? byCurrency.get(primaryCurrency)!
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/15 text-primary grid size-8 place-items-center rounded-full">
            <Wallet className="size-4" />
          </span>
          <CardTitle>Expenses</CardTitle>
        </div>
        <div className="text-right">
          {[...byCurrency.entries()].map(([c, a]) => (
            <div key={c} className="text-sm tabular-nums">
              {formatMoney(a, c)}
            </div>
          ))}
          {byCurrency.size === 0 && (
            <div className="text-muted-foreground text-sm">No expenses yet</div>
          )}
        </div>
      </CardHeader>

      {categories.length > 0 && (
        <div className="px-6 pb-6">
          <div className="space-y-3">
            {categories.map(([cat, currencies]) => {
              const meta = kindMeta[cat as keyof typeof kindMeta];
              const amount = primaryCurrency
                ? (currencies.get(primaryCurrency) ?? 0)
                : 0;
              const pct = totalForPrimary
                ? (amount / totalForPrimary) * 100
                : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {[...currencies.entries()]
                        .map(([c, a]) => formatMoney(a, c))
                        .join(' · ')}
                    </span>
                  </div>
                  <div className="bg-secondary/70 mt-1.5 h-1.5 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: meta.accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
