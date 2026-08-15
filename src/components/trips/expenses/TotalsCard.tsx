'use client';

import { useMemo, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { type EurRates } from '@/lib/trips/fx';
import {
  combineInCurrency,
  type ExpenseCurrencyTotals,
} from '@/lib/trips/expenseTotals';
import { formatMoney } from '@/lib/trips/grouping';
import { cn } from '@/lib/utils';
import type { TripMember } from '@/lib/trips/types';
import { ShareScopeSelect, type ShareScope } from './ShareScopeSelect';
import { ExpensesTotalsSkeleton } from './ExpensesSkeleton';

const STORAGE_PREFIX = 'travelando.displayCurrency.';

/** Persisted per-trip display-currency preference, read lazily on mount. */
function readStoredCurrency(tripId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + tripId);
  } catch {
    return null;
  }
}

function writeStoredCurrency(tripId: string, code: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + tripId, code);
  } catch {
    // localStorage quota or disabled; ignore
  }
}

interface TotalsCardProps {
  tripId: string;
  totals: ExpenseCurrencyTotals;
  rates: EurRates | null;
  isLoading: boolean;
  /** True when the trip-wide total is in focus (vs. a single member's share). */
  isTripScope: boolean;
  /** Headline caption, e.g. "Trip total", "My share", "Alex's share". */
  scopeCaption: string;
  members: TripMember[];
  focusMemberId: ShareScope;
  currentMemberId: string | null;
  onScopeChange: (value: ShareScope) => void;
}

export function TotalsCard({
  tripId,
  totals,
  rates,
  isLoading,
  isTripScope,
  scopeCaption,
  members,
  focusMemberId,
  currentMemberId,
  onScopeChange,
}: TotalsCardProps) {
  const codes = useMemo(
    () => totals.byCurrency.map((c) => c.currency),
    [totals.byCurrency],
  );

  // Converting only makes sense with rates loaded and more than one currency.
  const canConvert = Boolean(rates) && codes.length > 1;

  const [expanded, setExpanded] = useState(false);
  // The user's explicit pick, seeded from the stored per-trip preference. Left
  // null until a pick is valid for the current set; the derived currency below
  // falls back to the largest-total currency, keeping the choice valid as
  // filters change the currencies in play.
  const [chosen, setChosen] = useState<string | null>(() =>
    readStoredCurrency(tripId),
  );

  const displayCurrency =
    chosen && codes.includes(chosen) ? chosen : (codes[0] ?? 'EUR');

  const combined = useMemo(
    () =>
      rates
        ? combineInCurrency(totals.byCurrency, displayCurrency, rates)
        : null,
    [totals.byCurrency, displayCurrency, rates],
  );

  const selectCurrency = (code: string) => {
    setChosen(code);
    writeStoredCurrency(tripId, code);
  };

  const showConverted = canConvert && !expanded && combined !== null;

  return (
    <section className="border-border/70 bg-card mt-4 overflow-hidden rounded-[var(--radius-xl)] border p-5 shadow-[0_1px_2px_oklch(20%_0.02_250_/_0.04),0_18px_42px_-24px_oklch(20%_0.02_250_/_0.18)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-[10px] tracking-[0.16em] uppercase">
          {scopeCaption}
        </span>
        <div className="flex items-center gap-2">
          {canConvert && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? 'Show a single converted total'
                  : 'Show every currency'
              }
              className="border-border/50 bg-secondary/60 hover:bg-secondary focus-visible:ring-ring/60 text-muted-foreground hover:text-foreground grid size-8 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {expanded ? (
                <ChevronsDownUp className="size-4" />
              ) : (
                <ChevronsUpDown className="size-4" />
              )}
            </button>
          )}
          <ShareScopeSelect
            members={members}
            value={focusMemberId}
            currentMemberId={currentMemberId}
            onChange={onScopeChange}
          />
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <ExpensesTotalsSkeleton />
        ) : totals.byCurrency.length === 0 ? (
          <span className="font-display text-3xl tabular-nums sm:text-4xl">
            —
          </span>
        ) : showConverted && combined ? (
          <ConvertedTotal
            combined={combined}
            isTripScope={isTripScope}
            codes={codes}
            displayCurrency={displayCurrency}
            onSelectCurrency={selectCurrency}
          />
        ) : (
          <BreakdownList totals={totals} isTripScope={isTripScope} />
        )}
      </div>
    </section>
  );
}

interface ConvertedTotalProps {
  combined: ReturnType<typeof combineInCurrency>;
  isTripScope: boolean;
  codes: string[];
  displayCurrency: string;
  onSelectCurrency: (code: string) => void;
}

function ConvertedTotal({
  combined,
  isTripScope,
  codes,
  displayCurrency,
  onSelectCurrency,
}: ConvertedTotalProps) {
  const primary = isTripScope ? combined.total : combined.mine;
  const secondary = isTripScope ? combined.mine : combined.total;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-3xl leading-none tabular-nums sm:text-4xl">
          ≈ {formatMoney(primary, combined.currency)}
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {isTripScope
            ? `your share ≈ ${formatMoney(secondary, combined.currency)}`
            : `of ≈ ${formatMoney(secondary, combined.currency)} trip total`}
        </span>
        {combined.unconvertible.length > 0 && (
          <span className="text-muted-foreground/80 mt-0.5 text-[11px]">
            + {combined.unconvertible.join(', ')} not converted
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {codes.map((code) => {
          const active = code === displayCurrency;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onSelectCurrency(code)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] transition-colors',
                active
                  ? 'border-foreground/30 bg-secondary text-foreground'
                  : 'border-border/50 bg-background/40 text-muted-foreground hover:bg-secondary/50',
              )}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface BreakdownListProps {
  totals: ExpenseCurrencyTotals;
  isTripScope: boolean;
}

function BreakdownList({ totals, isTripScope }: BreakdownListProps) {
  return (
    <div className="flex flex-col gap-2">
      {totals.byCurrency.map((c) => {
        const primary = isTripScope ? c.total : c.mine;
        const secondary = isTripScope ? c.mine : c.total;
        return (
          <div key={c.currency} className="flex flex-col gap-0.5">
            <span className="font-display text-3xl leading-none tabular-nums sm:text-4xl">
              {formatMoney(primary, c.currency)}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {isTripScope
                ? `your share ${formatMoney(secondary, c.currency)}`
                : `of ${formatMoney(secondary, c.currency)} trip total`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
