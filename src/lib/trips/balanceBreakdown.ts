import { expandShares } from './balances';
import type { Expense, ExpenseSplitMode, Settlement } from './types';

/**
 * A single expense's contribution to one member's net, in the expense's
 * native currency. `paid` is the full amount when the member fronted it,
 * `share` is their slice of the split, and `net = paid - share`.
 */
export interface BreakdownExpenseLine {
  expenseId: string;
  title: string;
  spentOn: string;
  currency: string;
  mode: ExpenseSplitMode;
  /** Number of members the expense was split across. */
  splitCount: number;
  /** True when this member fronted the payment. */
  isPayer: boolean;
  /** Full expense amount (what the payer laid out). */
  amount: number;
  /** Amount this member actually paid up front (0 unless payer). */
  paid: number;
  /** This member's share of the split. */
  share: number;
  /** Effect on the member's net for this expense: `paid - share`. */
  net: number;
}

/**
 * A settlement's contribution to one member's net. Sending money raises the
 * member's net (they paid out); receiving lowers it (credit consumed).
 */
export interface BreakdownSettlementLine {
  settlementId: string;
  direction: 'sent' | 'received';
  counterpartyMemberId: string;
  currency: string;
  amount: number;
  settledOn: string;
  note?: string;
  /** Effect on the member's net: `+amount` when sent, `-amount` when received. */
  net: number;
}

export interface MemberBreakdownCurrency {
  currency: string;
  expenses: BreakdownExpenseLine[];
  settlements: BreakdownSettlementLine[];
  /** Everything this member laid out: fronted expenses + settlements sent. */
  paidTotal: number;
  /** Everything charged to this member: their shares + settlements received. */
  owedTotal: number;
  /** `paidTotal - owedTotal`; matches the net shown on the Balances tab. */
  net: number;
}

export interface MemberBreakdown {
  memberId: string;
  byCurrency: MemberBreakdownCurrency[];
}

const SHARE_EPSILON = 0.005;

interface CurrencyBucket {
  expenses: BreakdownExpenseLine[];
  settlements: BreakdownSettlementLine[];
  paidTotal: number;
  owedTotal: number;
}

function emptyBucket(): CurrencyBucket {
  return { expenses: [], settlements: [], paidTotal: 0, owedTotal: 0 };
}

/**
 * Itemize exactly which expenses and settlements produced a member's net
 * balance, grouped by currency. Mirrors `computeBalances`: resolved expenses
 * are skipped, and each currency's `net` reconciles to the Balances tab.
 *
 * A line is included only when it touches the member — they fronted the
 * expense, hold a non-trivial share of it, or are a party to the settlement.
 */
export function computeMemberBreakdown(
  expenses: Expense[],
  settlements: Settlement[],
  memberId: string,
): MemberBreakdown {
  const byCurrency = new Map<string, CurrencyBucket>();

  function bucketFor(currency: string): CurrencyBucket {
    const bucket = byCurrency.get(currency) ?? emptyBucket();
    if (!byCurrency.has(currency)) byCurrency.set(currency, bucket);
    return bucket;
  }

  for (const expense of expenses) {
    if (expense.resolved) continue;
    const expanded = expandShares(expense);
    const share = expanded.find((s) => s.memberId === memberId)?.share ?? 0;
    const isPayer = expense.payerMemberId === memberId;
    if (!isPayer && share <= SHARE_EPSILON) continue;

    const currency = expense.currency.toUpperCase();
    const bucket = bucketFor(currency);
    const paid = isPayer ? expense.amount : 0;
    bucket.paidTotal += paid;
    bucket.owedTotal += share;
    bucket.expenses.push({
      expenseId: expense.id,
      title: expense.title,
      spentOn: expense.spentOn,
      currency,
      mode: expense.mode,
      splitCount: expanded.length,
      isPayer,
      amount: expense.amount,
      paid,
      share,
      net: paid - share,
    });
  }

  for (const settlement of settlements) {
    const isSender = settlement.fromMemberId === memberId;
    const isReceiver = settlement.toMemberId === memberId;
    if (!isSender && !isReceiver) continue;

    const currency = settlement.currency.toUpperCase();
    const bucket = bucketFor(currency);
    if (isSender) {
      bucket.paidTotal += settlement.amount;
    } else {
      bucket.owedTotal += settlement.amount;
    }
    bucket.settlements.push({
      settlementId: settlement.id,
      direction: isSender ? 'sent' : 'received',
      counterpartyMemberId: isSender
        ? settlement.toMemberId
        : settlement.fromMemberId,
      currency,
      amount: settlement.amount,
      settledOn: settlement.settledOn,
      note: settlement.note,
      net: isSender ? settlement.amount : -settlement.amount,
    });
  }

  const currencies = [...byCurrency.entries()]
    .map(([currency, bucket]) => ({
      currency,
      expenses: bucket.expenses,
      settlements: bucket.settlements,
      paidTotal: bucket.paidTotal,
      owedTotal: bucket.owedTotal,
      net: bucket.paidTotal - bucket.owedTotal,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return { memberId, byCurrency: currencies };
}

/** Human label for a split mode, used in the breakdown UI. */
export function splitModeLabel(
  mode: ExpenseSplitMode,
  splitCount: number,
): string {
  switch (mode) {
    case 'equally':
      return `Split equally · ${splitCount} ${splitCount === 1 ? 'person' : 'people'}`;
    case 'parts':
      return 'Split by shares';
    case 'amounts':
      return 'Split by exact amounts';
  }
}
