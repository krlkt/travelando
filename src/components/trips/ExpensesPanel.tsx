'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { kindMeta } from '@/lib/trips/kindMeta';
import {
  formatMoney,
  totalsByCategory,
  totalsByCurrency,
} from '@/lib/trips/grouping';
import { convertToEur, getEurRates, type EurRates } from '@/lib/trips/fx';
import type { Trip } from '@/lib/trips/types';

export function ExpensesPanel({ trip }: { trip: Trip }) {
  const [rates, setRates] = useState<EurRates | null>(null);

  useEffect(() => {
    let active = true;
    getEurRates().then((r) => {
      if (active) setRates(r);
    });
    return () => {
      active = false;
    };
  }, []);

  const byCurrency = totalsByCurrency(trip.items);
  const byCategory = totalsByCategory(trip.items);
  const categories = Array.from(byCategory.entries());

  const eurByCategory = new Map<string, number>();
  const excluded = new Set<string>();
  let totalEur = 0;
  if (rates) {
    for (const [cat, currencies] of byCategory.entries()) {
      let catEur = 0;
      for (const [code, amount] of currencies.entries()) {
        const eur = convertToEur(amount, code, rates);
        if (eur === null) {
          excluded.add(code);
          continue;
        }
        catEur += eur;
      }
      eurByCategory.set(cat, catEur);
      totalEur += catEur;
    }
  }

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
              const eurAmount = eurByCategory.get(cat) ?? 0;
              const pct = totalEur > 0 ? (eurAmount / totalEur) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="shrink-0 font-medium">{meta.label}</span>
                    <span className="text-muted-foreground text-right tabular-nums">
                      {[...currencies.entries()]
                        .map(([c, a]) => formatMoney(a, c))
                        .join(' · ')}
                    </span>
                  </div>
                  <div className="bg-secondary/70 mt-1.5 h-1.5 overflow-hidden rounded-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{ background: meta.accent }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {excluded.size > 0 && (
            <p className="text-muted-foreground/80 mt-3 text-[11px]">
              Not included in %: {[...excluded].sort().join(', ')}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
