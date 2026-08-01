'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Scale, ArrowLeftRight, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/trips/grouping';
import { fadeUp, stagger } from '@/lib/motion/presets';
import { simplifyDebts, tripCurrencies } from '@/lib/trips/balances';
import type {
  BalancesResult,
  UserSummary,
  UserSummaryEntry,
} from '@/lib/trips/balances';
import type { Expense, Settlement, Trip, TripMember } from '@/lib/trips/types';
import { SettleSheet } from './SettleSheet';
import { SettlementsLog } from './SettlementsLog';
import { BalanceBreakdownDialog } from './BalanceBreakdownDialog';

interface BalancesTabProps {
  trip: Trip;
  result: BalancesResult | null;
  summary: UserSummary | null;
  members: TripMember[];
  currentMemberId: string | null;
  expenses: Expense[];
  settlements: Settlement[];
  onRemoveSettlement: (id: string) => Promise<void>;
}

export function BalancesTab({
  trip,
  result,
  summary,
  members,
  currentMemberId,
  expenses,
  settlements,
  onRemoveSettlement,
}: BalancesTabProps) {
  const [settleOpen, setSettleOpen] = useState(false);
  const [editing, setEditing] = useState<Settlement | null>(null);
  const [breakdownMember, setBreakdownMember] = useState<TripMember | null>(
    null,
  );

  function openEdit(settlement: Settlement) {
    setEditing(settlement);
    setSettleOpen(true);
  }

  function handleSheetOpenChange(open: boolean) {
    setSettleOpen(open);
    if (!open) setEditing(null);
  }

  if (!result) {
    return (
      <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">No balances yet.</p>
      </div>
    );
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const currencies = tripCurrencies(result);
  const canSettle = members.length >= 2;
  const debts = simplifyDebts(result);

  function debtLinesFor(memberId: string): DebtLine[] {
    const lines: DebtLine[] = [];
    for (const debt of debts) {
      if (debt.fromMemberId === memberId) {
        lines.push({
          kind: 'owes',
          other: memberById.get(debt.toMemberId)?.displayName ?? 'Unknown',
          currency: debt.currency,
          amount: debt.amount,
        });
      } else if (debt.toMemberId === memberId) {
        lines.push({
          kind: 'owed',
          other: memberById.get(debt.fromMemberId)?.displayName ?? 'Unknown',
          currency: debt.currency,
          amount: debt.amount,
        });
      }
    }
    return lines;
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger(0, 0.04)}
        className="flex flex-col gap-4"
      >
        {summary && (
          <motion.section
            variants={fadeUp}
            className="border-border/70 bg-card flex items-start gap-3 rounded-[var(--radius-lg)] border p-4"
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${summaryAccent(
                summary,
              )}`}
            >
              <Scale className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <SummarySentence summary={summary} />
            </div>
            {canSettle && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  setEditing(null);
                  setSettleOpen(true);
                }}
              >
                <ArrowLeftRight className="size-4" />
                Settle up
              </Button>
            )}
          </motion.section>
        )}

        <motion.section variants={fadeUp}>
          <h3 className="text-muted-foreground mb-2 px-1 text-[10px] tracking-[0.18em] uppercase">
            Per person
          </h3>
          <div className="border-border/70 bg-card overflow-hidden rounded-[var(--radius-lg)] border">
            {result.balances.map((balance, idx) => {
              const member = memberById.get(balance.memberId);
              if (!member) return null;
              const isMe = balance.memberId === currentMemberId;
              const lines = debtLinesFor(balance.memberId);
              return (
                <div
                  key={balance.memberId}
                  className={`flex flex-col gap-2 px-4 py-3 ${
                    idx > 0 ? 'border-border/40 border-t' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="leading-tight font-medium">
                      {member.displayName}
                      {isMe && (
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          (you)
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground -mr-1.5 h-7 gap-1 px-2 text-xs"
                      onClick={() => setBreakdownMember(member)}
                      aria-label={`See how ${member.displayName}'s balance is calculated`}
                    >
                      <ListTree className="size-3.5" />
                      Details
                    </Button>
                  </div>
                  {lines.length === 0 ? (
                    <div className="text-muted-foreground text-xs">Settled</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {lines.map((line, i) => (
                        <DebtRow key={i} line={line} isMe={isMe} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        <SettlementsLog
          settlements={settlements}
          members={members}
          onEdit={openEdit}
          onRemove={onRemoveSettlement}
        />
      </motion.div>

      <SettleSheet
        trip={trip}
        open={settleOpen}
        onOpenChange={handleSheetOpenChange}
        members={members}
        currencies={currencies}
        currentMemberId={currentMemberId}
        settlement={editing}
      />

      <BalanceBreakdownDialog
        member={breakdownMember}
        members={members}
        expenses={expenses}
        settlements={settlements}
        open={breakdownMember !== null}
        onOpenChange={(open) => {
          if (!open) setBreakdownMember(null);
        }}
      />
    </>
  );
}

interface DebtLine {
  kind: 'owes' | 'owed';
  /** Display name of the counterparty. */
  other: string;
  currency: string;
  amount: number;
}

interface DebtRowProps {
  line: DebtLine;
  isMe: boolean;
}

function DebtRow({ line, isMe }: DebtRowProps) {
  const owes = line.kind === 'owes';
  // "owes" = money flowing out (debt); "owed" = money flowing in (credit).
  const label = owes
    ? `${isMe ? 'You owe' : 'Owes'} ${line.other}`
    : `${isMe ? "You're owed by" : 'Owed by'} ${line.other}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground min-w-0 truncate text-xs">
        {label}
      </div>
      <div
        className={`shrink-0 text-right text-sm font-medium tabular-nums ${
          owes ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {owes ? '−' : '+'}
        {formatMoney(line.amount, line.currency)}
      </div>
    </div>
  );
}

function summaryAccent(summary: UserSummary): string {
  if (summary.kind === 'settled') {
    return 'bg-secondary text-muted-foreground';
  }
  const owedCount = summary.entries.filter((e) => e.kind === 'owed').length;
  const owesCount = summary.entries.filter((e) => e.kind === 'owes').length;
  if (owedCount > 0 && owesCount === 0) {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
  }
  if (owesCount > 0 && owedCount === 0) {
    return 'bg-destructive/15 text-destructive';
  }
  return 'bg-secondary text-muted-foreground';
}

function SummarySentence({ summary }: { summary: UserSummary }) {
  if (summary.kind === 'settled' || summary.entries.length === 0) {
    return (
      <p className="text-sm">
        <span className="font-medium">All settled up.</span>{' '}
        <span className="text-muted-foreground">No balances to reconcile.</span>
      </p>
    );
  }
  const who =
    summary.counterpartyCount === 1
      ? '1 person'
      : `${summary.counterpartyCount} people`;
  return (
    <div className="flex flex-col gap-0.5">
      {summary.entries.map((entry) => (
        <EntrySentence key={entry.currency} entry={entry} />
      ))}
      <p className="text-muted-foreground mt-0.5 text-xs">across {who}.</p>
    </div>
  );
}

function EntrySentence({ entry }: { entry: UserSummaryEntry }) {
  if (entry.kind === 'owed') {
    return (
      <p className="text-sm">
        <span className="text-muted-foreground">You&apos;re owed </span>
        <span className="font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
          {formatMoney(entry.amount, entry.currency)}
        </span>
      </p>
    );
  }
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">You owe </span>
      <span className="text-destructive font-medium tabular-nums">
        {formatMoney(entry.amount, entry.currency)}
      </span>
    </p>
  );
}
