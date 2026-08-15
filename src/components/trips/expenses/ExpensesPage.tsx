'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
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
import {
  countCityGroups,
  resolveExpenseCities,
} from '@/lib/trips/expenseCities';
import type { Expense } from '@/lib/trips/types';
import { ExpenseSheet } from './ExpenseSheet';
import { ExpensesList } from './ExpensesList';
import { BalancesTab } from './BalancesTab';
import { CategoryWidget } from './CategoryWidget';
import { CityFilter } from './CityFilter';
import { type ShareScope } from './ShareScopeSelect';
import { TotalsCard } from './TotalsCard';
import { ExpensesBodySkeleton } from './ExpensesSkeleton';
import {
  ExpenseSortToggle,
  type AmountSortDir,
  type ExpenseSortMode,
} from './ExpenseSortToggle';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type { ExpenseCategory } from '@/lib/trips/types';

const SHARE_EPSILON = 0.005;

function firstNameOf(name: string): string {
  return name.split(/\s+/)[0] || name;
}

/** Possessive form of a name: "Alex" → "Alex's", "Chris" → "Chris'". */
function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

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
    extrasStatus,
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
  // `undefined` means "follow the current member" (the default "My share"
  // view); once the user picks explicitly it holds a memberId or `null` (trip).
  const [chosenScope, setChosenScope] = useState<ShareScope | undefined>(
    undefined,
  );
  const [sortMode, setSortMode] = useState<ExpenseSortMode>('spent');
  const [amountDir, setAmountDir] = useState<AmountSortDir>('desc');

  useEffect(() => {
    loadTripExtras(tripId).catch(() => {
      toast.error("Couldn't load expenses. Pull to refresh or try again.");
    });
  }, [tripId, loadTripExtras]);

  const isLoadingExtras = extrasStatus[tripId] === 'loading';

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

  // The member whose share is in focus. `null` = trip total. Defaults to the
  // current member until they explicitly pick another scope.
  const focusMemberId: ShareScope =
    chosenScope === undefined ? currentMemberId : chosenScope;
  const isTripScope = focusMemberId === null;
  const isMeScope = focusMemberId !== null && focusMemberId === currentMemberId;

  // Scope labels derived from the focused member. Memoized so the surrounding
  // memos keep their manual memoization (the React Compiler bails if a plain
  // `trip.members` lookup sits loose in the render body).
  const { scopeCaption, categoryScopeName, focusName } = useMemo(() => {
    const member = focusMemberId
      ? (trip.members.find((m) => m.id === focusMemberId) ?? null)
      : null;
    // Possessive short label, e.g. "Alex's" (or "Alex'").
    const possessiveName = member
      ? possessive(firstNameOf(member.displayName))
      : '';
    return {
      // Headline caption for the totals card.
      scopeCaption: isTripScope
        ? 'Trip total'
        : isMeScope
          ? 'My share'
          : `${possessiveName} share`,
      // Scope word for the category widget heading.
      categoryScopeName: isTripScope
        ? 'Trip'
        : isMeScope
          ? 'Your'
          : possessiveName,
      // Short name for the empty state; `null` for the trip scope.
      focusName: isTripScope
        ? null
        : isMeScope
          ? 'you'
          : firstNameOf(member?.displayName ?? 'them'),
    };
  }, [trip.members, focusMemberId, isTripScope, isMeScope]);

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
  // Chip counts track the same scope filter the list uses, so a member scope
  // counts only expenses that member is part of. Resolution stays on the full
  // set so the city filter and headline totals are unaffected.
  const cityCountExpenses = useMemo(
    () =>
      focusMemberId
        ? categoryExpenses.filter(
            (e) => shareForMember(e, focusMemberId) > SHARE_EPSILON,
          )
        : categoryExpenses,
    [categoryExpenses, focusMemberId],
  );
  const cityGroups = useMemo(
    () => countCityGroups(cityResolution, cityCountExpenses),
    [cityResolution, cityCountExpenses],
  );

  // In a member scope, only expenses that member is part of appear.
  const visibleExpenses = useMemo(
    () =>
      focusMemberId
        ? cityExpenses.filter(
            (e) => shareForMember(e, focusMemberId) > SHARE_EPSILON,
          )
        : cityExpenses,
    [cityExpenses, focusMemberId],
  );

  // The headline total reflects the active filters (category + city), so it
  // tracks what's actually listed. Scope only decides which figure reads as
  // primary; both come from this set. `mine` carries the focused member's
  // share, falling back to the current member so the trip-scope secondary line
  // can still show "your share".
  const totals = useMemo(
    () => aggregateByCurrency(cityExpenses, focusMemberId ?? currentMemberId),
    [cityExpenses, focusMemberId, currentMemberId],
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
        <TotalsCard
          tripId={tripId}
          totals={totals}
          rates={rates}
          isLoading={isLoadingExtras}
          isTripScope={isTripScope}
          scopeCaption={scopeCaption}
          members={trip.members}
          focusMemberId={focusMemberId}
          currentMemberId={currentMemberId}
          onScopeChange={setChosenScope}
        />

        {isLoadingExtras ? (
          <ExpensesBodySkeleton />
        ) : (
          <>
            <CategoryWidget
              expenses={categoryWidgetExpenses}
              rates={rates}
              focusMemberId={focusMemberId}
              scopeName={categoryScopeName}
              selected={selectedCategories}
              onToggle={handleToggleCategory}
              onClear={() => setSelectedCategories([])}
            />

            <CityFilter
              groups={cityGroups}
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
                    focusName={focusName}
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
                      focusMemberId={focusMemberId}
                      sort={sortMode}
                      amountDir={amountDir}
                      rates={rates}
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
                  expenses={tripExpenses}
                  settlements={tripSettlements}
                  onRemoveSettlement={(id) => removeSettlement(trip.id, id)}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
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
          // If the current scope is a member the new expense doesn't involve,
          // fall back to the trip total so it's never hidden.
          if (
            focusMemberId &&
            shareForMember(created, focusMemberId) <= SHARE_EPSILON
          ) {
            setChosenScope(null);
          }
        }}
      />
    </div>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
  /** Whose share is in focus; `null` for the trip scope. "you" for self. */
  focusName: string | null;
  hasAny: boolean;
}

function EmptyState({ onAdd, focusName, hasAny }: EmptyStateProps) {
  // A member scope with expenses present means none of them involve that member.
  const noneForMember = focusName !== null && hasAny;
  const splitLabel = focusName === 'you' ? 'you' : focusName;
  return (
    <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-16 text-center">
      <span className="bg-primary/15 text-primary mb-3 grid size-10 place-items-center rounded-full">
        <Wallet className="size-5" />
      </span>
      <p className="text-muted-foreground max-w-sm text-sm">
        {noneForMember
          ? `None of these expenses are split with ${splitLabel}. Switch to Trip total to see them all.`
          : 'No expenses yet. Track what gets spent, who paid, and how to split it.'}
      </p>
      {!noneForMember && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onAdd}>
          <Plus className="size-4" />
          Add first expense
        </Button>
      )}
    </div>
  );
}
