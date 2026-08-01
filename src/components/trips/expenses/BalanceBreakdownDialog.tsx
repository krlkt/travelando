'use client';

import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/trips/grouping';
import {
  computeMemberBreakdown,
  splitModeLabel,
  type BreakdownExpenseLine,
  type BreakdownSettlementLine,
  type MemberBreakdownCurrency,
} from '@/lib/trips/balanceBreakdown';
import type { Expense, Settlement, TripMember } from '@/lib/trips/types';

interface BalanceBreakdownDialogProps {
  member: TripMember | null;
  members: TripMember[];
  expenses: Expense[];
  settlements: Settlement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Green when the figure moves the member toward being owed, red toward owing. */
function signedClass(net: number): string {
  return net >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-destructive';
}

function signedMoney(net: number, currency: string): string {
  const sign = net >= 0 ? '+' : '−';
  return `${sign}${formatMoney(Math.abs(net), currency)}`;
}

export function BalanceBreakdownDialog({
  member,
  members,
  expenses,
  settlements,
  open,
  onOpenChange,
}: BalanceBreakdownDialogProps) {
  const nameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.displayName])),
    [members],
  );

  const breakdown = useMemo(() => {
    if (!member) return null;
    return computeMemberBreakdown(expenses, settlements, member.id);
  }, [member, expenses, settlements]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <DialogHeader className="border-border/60 border-b px-5 py-4 text-left">
          <DialogTitle className="text-base">
            {member ? `${member.displayName}'s balance` : 'Balance detail'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Every expense and settlement that adds up to this number.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-72px)] overflow-y-auto px-5 py-4">
          {!breakdown || breakdown.byCurrency.length === 0 ? (
            <div className="text-muted-foreground grid place-items-center gap-2 py-10 text-center">
              <Receipt className="size-5 opacity-60" />
              <p className="text-sm">Nothing to break down yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {breakdown.byCurrency.map((c) => (
                <CurrencyBlock key={c.currency} block={c} nameById={nameById} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CurrencyBlockProps {
  block: MemberBreakdownCurrency;
  nameById: Map<string, string>;
}

function CurrencyBlock({ block, nameById }: CurrencyBlockProps) {
  const owed = block.net >= 0;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground text-[10px] font-medium tracking-[0.18em] uppercase">
          {block.currency}
        </span>
        <span className={`text-sm font-semibold ${signedClass(block.net)}`}>
          {owed ? 'Owed ' : 'Owes '}
          <span className="tabular-nums">
            {formatMoney(Math.abs(block.net), block.currency)}
          </span>
        </span>
      </div>

      <div className="border-border/70 bg-card divide-border/40 divide-y overflow-hidden rounded-[var(--radius-lg)] border">
        {block.expenses.map((line) => (
          <ExpenseRow key={line.expenseId} line={line} />
        ))}
        {block.settlements.map((line) => (
          <SettlementRow
            key={line.settlementId}
            line={line}
            counterparty={nameById.get(line.counterpartyMemberId) ?? 'Unknown'}
          />
        ))}
      </div>

      <dl className="text-muted-foreground flex flex-col gap-1 px-1 text-xs">
        <div className="flex items-center justify-between">
          <dt>Paid out (fronted + sent)</dt>
          <dd className="text-foreground tabular-nums">
            {formatMoney(block.paidTotal, block.currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Owed (your shares + received)</dt>
          <dd className="text-foreground tabular-nums">
            {formatMoney(block.owedTotal, block.currency)}
          </dd>
        </div>
        <div className="border-border/50 mt-1 flex items-center justify-between border-t pt-1.5">
          <dt className="text-foreground font-medium">Net</dt>
          <dd
            className={`font-semibold tabular-nums ${signedClass(block.net)}`}
          >
            {signedMoney(block.net, block.currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ExpenseRow({ line }: { line: BreakdownExpenseLine }) {
  const caption = line.isPayer
    ? `You paid ${formatMoney(line.amount, line.currency)} · your share ${formatMoney(line.share, line.currency)}`
    : `Your share of ${formatMoney(line.amount, line.currency)} · ${splitModeLabel(line.mode, line.splitCount)}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="bg-secondary text-muted-foreground grid size-7 shrink-0 place-items-center rounded-full">
        <Receipt className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm leading-tight font-medium">
          <span className="truncate">{line.title}</span>
          <span className="text-muted-foreground shrink-0 text-xs font-normal">
            {formatDate(line.spentOn)}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {caption}
        </p>
      </div>
      <span
        className={`shrink-0 text-right text-sm font-medium tabular-nums ${signedClass(line.net)}`}
      >
        {signedMoney(line.net, line.currency)}
      </span>
    </div>
  );
}

function SettlementRow({
  line,
  counterparty,
}: {
  line: BreakdownSettlementLine;
  counterparty: string;
}) {
  const sent = line.direction === 'sent';
  const caption = sent
    ? `You paid ${counterparty}${line.note ? ` · ${line.note}` : ''}`
    : `${counterparty} paid you${line.note ? ` · ${line.note}` : ''}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full ${
          sent
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-destructive/15 text-destructive'
        }`}
      >
        {sent ? (
          <ArrowUpRight className="size-3.5" />
        ) : (
          <ArrowDownLeft className="size-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-tight font-medium">Settlement</div>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-xs">
          <span className="truncate">{caption}</span>
          <span>·</span>
          <span className="shrink-0">{formatDate(line.settledOn)}</span>
        </p>
      </div>
      <span
        className={`shrink-0 text-right text-sm font-medium tabular-nums ${signedClass(line.net)}`}
      >
        {signedMoney(line.net, line.currency)}
      </span>
    </div>
  );
}
