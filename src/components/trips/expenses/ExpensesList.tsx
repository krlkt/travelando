'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Users } from 'lucide-react';
import { formatMoney } from '@/lib/trips/grouping';
import { formatDateLong } from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import { shareForMember } from '@/lib/trips/balances';
import { categoryAccents, categoryLabels } from '@/lib/trips/expenseCategory';
import type { Expense, TripMember } from '@/lib/trips/types';
import type { ExpenseViewMode } from './ShareToggle';

interface ExpensesListProps {
  expenses: Expense[];
  members: TripMember[];
  mode: ExpenseViewMode;
  currentMemberId: string | null;
  onSelect: (expense: Expense) => void;
}

interface DayBucket {
  key: string;
  iso: string;
  rows: Expense[];
}

function groupByDay(expenses: Expense[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const e of expenses) {
    if (!map.has(e.spentOn)) {
      map.set(e.spentOn, {
        key: e.spentOn,
        iso: `${e.spentOn}T00:00:00`,
        rows: [],
      });
    }
    map.get(e.spentOn)!.rows.push(e);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export function ExpensesList({
  expenses,
  members,
  mode,
  currentMemberId,
  onSelect,
}: ExpensesListProps) {
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const buckets = useMemo(() => groupByDay(expenses), [expenses]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger(0, 0.04)}
      className="flex flex-col gap-5"
    >
      {buckets.map((bucket) => (
        <motion.section key={bucket.key} variants={fadeUp}>
          <h3 className="text-muted-foreground mb-2 px-1 text-[10px] tracking-[0.18em] uppercase">
            {formatDateLong(bucket.iso)}
          </h3>
          <div className="border-border/70 bg-card overflow-hidden rounded-[var(--radius-lg)] border">
            {bucket.rows.map((expense, idx) => {
              const payer = memberById.get(expense.payerMemberId);
              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => onSelect(expense)}
                  className={`hover:bg-secondary/40 group flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    idx > 0 ? 'border-border/40 border-t' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="leading-tight font-medium">
                      {expense.title}
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full"
                          style={{
                            background: categoryAccents[expense.category],
                          }}
                        />
                        {categoryLabels[expense.category]}
                      </span>
                      <span className="opacity-50">·</span>
                      <span className="truncate">
                        {payer?.displayName ?? 'Unknown'}
                      </span>
                      <ArrowRight className="size-3 shrink-0 opacity-50" />
                      <span className="flex items-center gap-0.5">
                        <Users className="size-3 shrink-0 opacity-60" />
                        {expense.shares.length}
                      </span>
                      <span className="opacity-50">·</span>
                      <span className="capitalize">{expense.mode}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm tabular-nums">
                      {formatMoney(
                        mode === 'mine'
                          ? shareForMember(expense, currentMemberId)
                          : expense.amount,
                        expense.currency,
                      )}
                    </div>
                    {mode === 'mine' && (
                      <div className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                        of {formatMoney(expense.amount, expense.currency)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.section>
      ))}
    </motion.div>
  );
}
