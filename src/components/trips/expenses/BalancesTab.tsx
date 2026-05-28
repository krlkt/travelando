'use client';

import { motion } from 'motion/react';
import { Scale } from 'lucide-react';
import { formatMoney } from '@/lib/trips/grouping';
import { fadeUp, stagger } from '@/lib/motion/presets';
import type {
  BalancesResult,
  CurrencyBalance,
  UserSummary,
  UserSummaryEntry,
} from '@/lib/trips/balances';
import type { TripMember } from '@/lib/trips/types';

interface BalancesTabProps {
  result: BalancesResult | null;
  summary: UserSummary | null;
  members: TripMember[];
  currentMemberId: string | null;
}

const SETTLED_EPSILON = 0.005;

export function BalancesTab({
  result,
  summary,
  members,
  currentMemberId,
}: BalancesTabProps) {
  if (!result) {
    return (
      <div className="border-border/70 bg-secondary/20 grid place-items-center rounded-[var(--radius-lg)] border border-dashed px-6 py-12 text-center">
        <p className="text-muted-foreground text-sm">No balances yet.</p>
      </div>
    );
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  return (
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
            const rows = balance.byCurrency.filter(
              (c) =>
                Math.abs(c.paid) >= SETTLED_EPSILON ||
                Math.abs(c.owed) >= SETTLED_EPSILON,
            );
            return (
              <div
                key={balance.memberId}
                className={`flex flex-col gap-2 px-4 py-3 ${
                  idx > 0 ? 'border-border/40 border-t' : ''
                }`}
              >
                <div className="leading-tight font-medium">
                  {member.displayName}
                  {isMe && (
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      (you)
                    </span>
                  )}
                </div>
                {rows.length === 0 ? (
                  <div className="text-muted-foreground text-xs">Settled</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {rows.map((c) => (
                      <CurrencyRow key={c.currency} row={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.section>
    </motion.div>
  );
}

function CurrencyRow({ row }: { row: CurrencyBalance }) {
  const isPositive = row.net > SETTLED_EPSILON;
  const isNegative = row.net < -SETTLED_EPSILON;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground text-xs tabular-nums">
        Paid {formatMoney(row.paid, row.currency)} ·{' '}
        {isPositive ? (
          <>Owed {formatMoney(row.net, row.currency)}</>
        ) : isNegative ? (
          <>Owes {formatMoney(-row.net, row.currency)}</>
        ) : (
          <>Settled</>
        )}
      </div>
      <div
        className={`text-right text-sm font-medium tabular-nums ${
          isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : isNegative
              ? 'text-destructive'
              : 'text-muted-foreground'
        }`}
      >
        {isPositive && '+'}
        {formatMoney(row.net, row.currency)}
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
