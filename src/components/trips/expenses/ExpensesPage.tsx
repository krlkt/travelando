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
  shareForMember,
  summarizeForUser,
} from '@/lib/trips/balances';
import { aggregateByCurrency } from '@/lib/trips/expenseTotals';
import { resolveExpenseCities } from '@/lib/trips/expenseCities';
import { formatMoney } from '@/lib/trips/grouping';
import type { Expense } from '@/lib/trips/types';
import { ExpenseSheet } from './ExpenseSheet';
import { ExpensesList } from './ExpensesList';
import { BalancesTab } from './BalancesTab';
import { CategoryWidget } from './CategoryWidget';
import { CityFilter } from './CityFilter';
import { ShareToggle, type ExpenseViewMode } from './ShareToggle';
import {
  ExpenseSortToggle,
  type AmountSortDir,
  type ExpenseSortMode,
} from './ExpenseSortToggle';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { ExpenseCategory } from '@/lib/trips/types';

const SHARE_EPSILON = 0.005;

interface ExpensesPageProps {
  tripId: string;
}

export function ExpensesPage({ tripId }: ExpensesPageProps) {
  const {
    getTrip,
    expenses,
    settlements,
    cityOverrides,
    removeSettlement,
    loadTripExtras,
  } = useTrips();
  const { user } = useAuth();
  const trip = getTrip(tripId);
  const [rates, setRates] = useState<EurRates | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<
    ExpenseCategory[]
  >([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ExpenseViewMode>('mine');
  const [sortMode, setSortMode] = useState<ExpenseSortMode>('spent');
  const [amountDir, setAmountDir] = useState<AmountSortDir>('desc');

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
  const tripSettlements = useMemo(
    () => settlements[tripId] ?? [],
    [settlements, tripId],
  );
  const currentMemberId = findMemberIdForUser(trip.members, user?.id);
  const categoryExpenses = useMemo(
    () =>
      selectedCategories.length === 0
        ? tripExpenses
        : tripExpenses.filter((e) => selectedCategories.includes(e.category)),
    [tripExpenses, selectedCategories],
  );

  const handleToggleCategory = (category: ExpenseCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };
  // Resolve each (category-filtered) expense to the city of its spent day, so
  // the chips and the city filter stay in sync with the category selection.
  const cityResolution = useMemo(
    () =>
      resolveExpenseCities(categoryExpenses, trip, cityOverrides[tripId] ?? []),
    [categoryExpenses, trip, cityOverrides, tripId],
  );
  const cityExpenses = useMemo(
    () =>
      selectedCity
        ? categoryExpenses.filter(
            (e) => cityResolution.keyByExpenseId.get(e.id) === selectedCity,
          )
        : categoryExpenses,
    [categoryExpenses, selectedCity, cityResolution],
  );
  // The category widget shows every category, so it can't reuse the
  // category-filtered resolution above. Resolve cities across all expenses and
  // narrow to the selected city only — leaving the category breakdown intact so
  // the tiles stay togglable while still tracking the active city.
  const fullCityResolution = useMemo(
    () => resolveExpenseCities(tripExpenses, trip, cityOverrides[tripId] ?? []),
    [tripExpenses, trip, cityOverrides, tripId],
  );
  const categoryWidgetExpenses = useMemo(
    () =>
      selectedCity
        ? tripExpenses.filter(
            (e) => fullCityResolution.keyByExpenseId.get(e.id) === selectedCity,
          )
        : tripExpenses,
    [tripExpenses, selectedCity, fullCityResolution],
  );
  // In "my share" mode, only expenses the current member is part of appear.
  const visibleExpenses = useMemo(
    () =>
      viewMode === 'mine'
        ? cityExpenses.filter(
            (e) => shareForMember(e, currentMemberId) > SHARE_EPSILON,
          )
        : cityExpenses,
    [cityExpenses, viewMode, currentMemberId],
  );

  // The headline total reflects the active filters (category + city), so it
  // tracks what's actually listed. View mode only decides which figure —
  // "my share" or "trip total" — reads as primary; both come from this set.
  const totals = useMemo(
    () => aggregateByCurrency(cityExpenses, currentMemberId),
    [cityExpenses, currentMemberId],
  );

  const balanceResult = useMemo(
    () => computeBalances(tripExpenses, trip.members, tripSettlements),
    [tripExpenses, trip.members, tripSettlements],
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
        <section className="border-border/70 bg-card mt-4 overflow-hidden rounded-[var(--radius-xl)] border p-5 shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_18px_42px_-24px_oklch(20%_0.02_250_/_0.18)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
              {viewMode === 'mine' ? 'My share' : 'Trip total'}
            </span>
            <ShareToggle value={viewMode} onChange={setViewMode} />
          </div>
          <div className="mt-3">
            {totals.byCurrency.length === 0 ? (
              <span className="font-display text-3xl tabular-nums sm:text-4xl">
                —
              </span>
            ) : (
              <div className="flex flex-col gap-2">
                {totals.byCurrency.map((c) => {
                  const primary = viewMode === 'mine' ? c.mine : c.total;
                  const secondary = viewMode === 'mine' ? c.total : c.mine;
                  return (
                    <div key={c.currency} className="flex flex-col gap-0.5">
                      <span className="font-display text-3xl leading-none tabular-nums sm:text-4xl">
                        {formatMoney(primary, c.currency)}
                      </span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {viewMode === 'mine'
                          ? `of ${formatMoney(secondary, c.currency)} trip total`
                          : `your share ${formatMoney(secondary, c.currency)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <CategoryWidget
          expenses={categoryWidgetExpenses}
          rates={rates}
          mode={viewMode}
          currentMemberId={currentMemberId}
          selected={selectedCategories}
          onToggle={handleToggleCategory}
          onClear={() => setSelectedCategories([])}
        />

        <CityFilter
          groups={cityResolution.groups}
          selected={selectedCity}
          onSelect={setSelectedCity}
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
              <EmptyState
                onAdd={handleAdd}
                mode={viewMode}
                hasAny={categoryExpenses.length > 0}
              />
            ) : (
              <>
                {visibleExpenses.length > 1 && (
                  <div className="mb-4 flex items-center justify-end">
                    <ExpenseSortToggle
                      value={sortMode}
                      amountDir={amountDir}
                      onChange={setSortMode}
                      onAmountDirChange={setAmountDir}
                    />
                  </div>
                )}
                <ExpensesList
                  expenses={visibleExpenses}
                  members={trip.members}
                  mode={viewMode}
                  sort={sortMode}
                  amountDir={amountDir}
                  rates={rates}
                  currentMemberId={currentMemberId}
                  onSelect={handleEdit}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="balances" className="mt-4">
            <BalancesTab
              trip={trip}
              result={balanceResult}
              summary={summary}
              members={trip.members}
              currentMemberId={currentMemberId}
              settlements={tripSettlements}
              onRemoveSettlement={(id) => removeSettlement(trip.id, id)}
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
        onAdded={(created) => {
          // Pull the server's authoritative list so the new expense shows
          // without a manual page refresh.
          loadTripExtras(tripId);
          // Clear any active filters so the just-added expense is never hidden
          // behind a category/city chip or the "my share" view.
          setSelectedCategories([]);
          setSelectedCity(null);
          if (
            viewMode === 'mine' &&
            shareForMember(created, currentMemberId) <= SHARE_EPSILON
          ) {
            setViewMode('trip');
          }
        }}
      />
    </div>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
  mode: ExpenseViewMode;
  hasAny: boolean;
}

function EmptyState({ onAdd, mode, hasAny }: EmptyStateProps) {
  // "mine" mode with expenses present means none of them involve the user.
  const noneForMe = mode === 'mine' && hasAny;
  return (
    <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center">
      <span className="bg-primary/15 text-primary mb-3 grid size-10 place-items-center rounded-full">
        <Wallet className="size-5" />
      </span>
      <p className="text-muted-foreground max-w-sm text-sm">
        {noneForMe
          ? 'None of these expenses are split with you. Switch to Trip total to see them all.'
          : 'No expenses yet. Track what gets spent, who paid, and how to split it.'}
      </p>
      {!noneForMe && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
          <Plus className="size-4" />
          Add first expense
        </Button>
      )}
    </div>
  );
}
