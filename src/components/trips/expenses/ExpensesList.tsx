'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Users } from 'lucide-react';
import { formatMoney } from '@/lib/trips/grouping';
import { formatDateLong } from '@/lib/time/formatDate';
import { fadeUp, stagger } from '@/lib/motion/presets';
import { shareForMember } from '@/lib/trips/balances';
import { convertToEur, type EurRates } from '@/lib/trips/fx';
import { categoryAccents, categoryLabels } from '@/lib/trips/expenseCategory';
import type { Expense, TripMember } from '@/lib/trips/types';
import type { AmountSortDir, ExpenseSortMode } from './ExpenseSortToggle';

interface ExpensesListProps {
  expenses: Expense[];
  members: TripMember[];
  /** Focused member whose share is shown; `null` = full trip amounts. */
  focusMemberId: string | null;
  sort: ExpenseSortMode;
  amountDir: AmountSortDir;
  rates: EurRates | null;
  onSelect: (expense: Expense) => void;
}

interface ListSection {
  key: string;
  /** Day header label; null renders an unheaded card (date-added ordering). */
  iso: string | null;
  rows: Expense[];
}

function groupByDay(expenses: Expense[]): ListSection[] {
  const map = new Map<string, ListSection>();
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

function byDateAdded(expenses: Expense[]): ListSection[] {
  const rows = [...expenses].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
  );
  if (rows.length === 0) return [];
  return [{ key: 'date-added', iso: null, rows }];
}

/**
 * The amount used for ordering, matching what each row displays: the focused
 * member's share when scoped to a member, the full amount otherwise. Normalized
 * to EUR so mixed currencies compare fairly; rows in non-convertible currencies
 * (or when rates are unavailable) fall back to their native amount.
 */
function sortAmount(
  expense: Expense,
  focusMemberId: string | null,
  rates: EurRates | null,
): number {
  const native = focusMemberId
    ? shareForMember(expense, focusMemberId)
    : expense.amount;
  if (!rates) return native;
  return convertToEur(native, expense.currency, rates) ?? native;
}

function byAmount(
  expenses: Expense[],
  focusMemberId: string | null,
  rates: EurRates | null,
  dir: AmountSortDir,
): ListSection[] {
  if (expenses.length === 0) return [];
  const valueById = new Map(
    expenses.map((e) => [e.id, sortAmount(e, focusMemberId, rates)]),
  );
  const rows = [...expenses].sort((a, b) => {
    const diff = (valueById.get(a.id) ?? 0) - (valueById.get(b.id) ?? 0);
    return dir === 'desc' ? -diff : diff;
  });
  return [{ key: 'amount', iso: null, rows }];
}

export function ExpensesList({
  expenses,
  members,
  focusMemberId,
  sort,
  amountDir,
  rates,
  onSelect,
}: ExpensesListProps) {
  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const buckets = useMemo(() => {
    if (sort === 'added') return byDateAdded(expenses);
    if (sort === 'amount')
      return byAmount(expenses, focusMemberId, rates, amountDir);
    return groupByDay(expenses);
  }, [expenses, sort, focusMemberId, rates, amountDir]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger(0, 0.04)}
      className="flex flex-col gap-5"
    >
      {buckets.map((bucket) => (
        <motion.section key={bucket.key} variants={fadeUp}>
          {bucket.iso && (
            <h3 className="text-muted-foreground mb-2 px-1 text-[10px] tracking-[0.18em] uppercase">
              {formatDateLong(bucket.iso)}
            </h3>
          )}
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
                      {expense.resolved && (
                        <span className="text-primary inline-flex items-center gap-0.5 font-medium">
                          <Check className="size-3 shrink-0" />
                          Settled
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm tabular-nums">
                      {formatMoney(
                        focusMemberId
                          ? shareForMember(expense, focusMemberId)
                          : expense.amount,
                        expense.currency,
                      )}
                    </div>
                    {focusMemberId && (
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
