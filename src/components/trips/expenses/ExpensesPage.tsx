'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrips } from '@/lib/trips/context';
import { useAuth } from '@/lib/auth/context';
import { getEurRates, type EurRates } from '@/lib/trips/fx';
import {
  computeBalances,
  findMemberIdForUser,
  summarizeForUser,
} from '@/lib/trips/balances';
import { aggregateByCurrency } from '@/lib/trips/expenseTotals';
import { formatMoney } from '@/lib/trips/grouping';
import type { Expense } from '@/lib/trips/types';
import { ExpenseSheet } from './ExpenseSheet';
import { ExpensesList } from './ExpensesList';
import { BalancesTab } from './BalancesTab';
import { CategoryWidget } from './CategoryWidget';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { ExpenseCategory } from '@/lib/trips/types';

interface ExpensesPageProps {
  tripId: string;
}

export function ExpensesPage({ tripId }: ExpensesPageProps) {
  const { getTrip, expenses, loadTripExtras } = useTrips();
  const { user } = useAuth();
  const trip = getTrip(tripId);
  const [rates, setRates] = useState<EurRates | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);

  useEffect(() => {
    loadTripExtras(tripId);
  }, [tripId, loadTripExtras]);

  useEffect(() => {
    let active = true;
    getEurRates().then((r) => {
      if (active) setRates(r);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!trip) notFound();

  const tripExpenses = useMemo(
    () => expenses[tripId] ?? [],
    [expenses, tripId],
  );
  const visibleExpenses = useMemo(
    () =>
      selectedCategory
        ? tripExpenses.filter((e) => e.category === selectedCategory)
        : tripExpenses,
    [tripExpenses, selectedCategory],
  );
  const currentMemberId = findMemberIdForUser(trip.members, user?.id);

  const totals = useMemo(
    () => aggregateByCurrency(tripExpenses, currentMemberId),
    [tripExpenses, currentMemberId],
  );

  const balanceResult = useMemo(
    () => computeBalances(tripExpenses, trip.members),
    [tripExpenses, trip.members],
  );

  const summary = useMemo(
    () => summarizeForUser(balanceResult, currentMemberId),
    [balanceResult, currentMemberId],
  );

  const handleAdd = () => {
    setEditingExpense(null);
    setSheetOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setSheetOpen(true);
  };

  return (
    <div className="relative">
      <header
        className="relative w-full overflow-hidden"
        style={{ background: trip.coverGradient }}
      >
        <div
          aria-hidden
          className="grain absolute inset-0 opacity-40 mix-blend-overlay"
        />
        <div
          aria-hidden
          className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent"
        />
        <div className="relative mx-auto flex min-h-[14rem] max-w-[var(--container-page)] flex-col gap-6 px-4 pt-4 pb-16 sm:px-6 md:min-h-[18rem] md:px-10 md:pt-6 md:pb-20">
          <div className="flex items-center justify-between gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="bg-background/60 text-foreground hover:bg-background/80 backdrop-blur-md"
            >
              <Link href={`/trips/${trip.id}`}>
                <ArrowLeft className="size-4" />
                Trip
              </Link>
            </Button>
          </div>
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger(0.05, 0.06)}
            className="text-background mt-auto min-w-0 drop-shadow-[0_2px_12px_oklch(15%_0.015_250_/_0.5)]"
          >
            <motion.div
              variants={fadeUp}
              className="text-[10px] tracking-[0.18em] uppercase opacity-90 sm:text-xs"
            >
              Expenses
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-display mt-1 text-[clamp(2rem,1rem+4vw,3.75rem)] leading-[1.05] tracking-tight break-words"
            >
              {trip.title}
            </motion.h1>
          </motion.div>
        </div>
      </header>

      <div className="mx-auto max-w-[var(--container-page)] px-4 pb-24 sm:px-6 md:px-10">
        <section className="border-border/70 bg-card mt-4 grid grid-cols-2 gap-2 overflow-hidden rounded-[var(--radius-xl)] border p-4 shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_18px_42px_-24px_oklch(20%_0.02_250_/_0.18)] sm:p-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
              My share
            </span>
            {totals.byCurrency.length === 0 ? (
              <span className="font-display text-2xl tabular-nums sm:text-3xl">
                —
              </span>
            ) : (
              <div className="flex flex-col gap-0.5">
                {totals.byCurrency.map((c) => (
                  <span
                    key={c.currency}
                    className="font-display text-2xl tabular-nums sm:text-3xl"
                  >
                    {formatMoney(c.mine, c.currency)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="border-border/60 flex flex-col gap-1.5 border-l pl-4">
            <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
              Trip total
            </span>
            {totals.byCurrency.length === 0 ? (
              <span className="font-display text-2xl tabular-nums sm:text-3xl">
                —
              </span>
            ) : (
              <div className="flex flex-col gap-0.5">
                {totals.byCurrency.map((c) => (
                  <span
                    key={c.currency}
                    className="font-display text-2xl tabular-nums sm:text-3xl"
                  >
                    {formatMoney(c.total, c.currency)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <CategoryWidget
          expenses={tripExpenses}
          rates={rates}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <Tabs defaultValue="expenses" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="size-4" />
              Add expense
            </Button>
          </div>

          <TabsContent value="expenses" className="mt-4">
            {visibleExpenses.length === 0 ? (
              <EmptyState onAdd={handleAdd} />
            ) : (
              <ExpensesList
                expenses={visibleExpenses}
                members={trip.members}
                onSelect={handleEdit}
              />
            )}
          </TabsContent>

          <TabsContent value="balances" className="mt-4">
            <BalancesTab
              result={balanceResult}
              summary={summary}
              members={trip.members}
              currentMemberId={currentMemberId}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ExpenseSheet
        trip={trip}
        expense={editingExpense}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditingExpense(null);
        }}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center">
      <span className="bg-primary/15 text-primary mb-3 grid size-10 place-items-center rounded-full">
        <Wallet className="size-5" />
      </span>
      <p className="text-muted-foreground max-w-sm text-sm">
        No expenses yet. Track what gets spent, who paid, and how to split it.
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
        <Plus className="size-4" />
        Add first expense
      </Button>
    </div>
  );
}
