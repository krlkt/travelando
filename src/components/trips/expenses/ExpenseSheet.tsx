'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Lock, LockOpen, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { CurrencyCombobox } from '@/components/trips/editor/CurrencyCombobox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTrips } from '@/lib/trips/context';
import { formatAmountInput, parseAmountInput } from '@/lib/trips/grouping';
import {
  readExpenseDefaults,
  resolvePayerDefault,
  resolveSelectionDefault,
  writeExpenseDefaults,
} from '@/lib/trips/expenseDefaults';
import {
  EXPENSE_CATEGORIES,
  categoryLabels,
} from '@/lib/trips/expenseCategory';
import { cn } from '@/lib/utils';
import type {
  Expense,
  ExpenseCategory,
  ExpenseDraft,
  ExpensePatch,
  ExpenseShare,
  ExpenseSplitMode,
  Trip,
  TripMember,
} from '@/lib/trips/types';

interface ExpenseSheetProps {
  trip: Trip;
  expense?: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string;
  privateToUserIds?: string[];
  defaultCategory?: ExpenseCategory;
  defaultTitle?: string;
  lockTitle?: boolean;
  /** Called with the newly created expense after a successful add (not edit). */
  onAdded?: (expense: Expense) => void;
}

export function ExpenseSheet({
  trip,
  expense,
  open,
  onOpenChange,
  itemId,
  privateToUserIds,
  defaultCategory,
  defaultTitle,
  lockTitle,
  onAdded,
}: ExpenseSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[480px]">
        {open && (
          <ExpenseBody
            trip={trip}
            expense={expense}
            onClose={() => onOpenChange(false)}
            itemId={itemId}
            privateToUserIds={privateToUserIds}
            defaultCategory={defaultCategory}
            defaultTitle={defaultTitle}
            lockTitle={lockTitle}
            onAdded={onAdded}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface SelectionState {
  selected: Set<string>;
  parts: Record<string, number>;
  amounts: Record<string, { value: number | null; locked: boolean }>;
}

function defaultSelectionState(
  members: TripMember[],
  selectedIds?: readonly string[],
): SelectionState {
  const selected = new Set(selectedIds ?? members.map((m) => m.id));
  const parts: Record<string, number> = {};
  const amounts: Record<string, { value: number | null; locked: boolean }> = {};
  for (const m of members) {
    parts[m.id] = 1;
    amounts[m.id] = { value: null, locked: false };
  }
  return { selected, parts, amounts };
}

function hydrateFromExpense(
  expense: Expense,
  members: TripMember[],
): SelectionState {
  const selected = new Set<string>();
  const parts: Record<string, number> = {};
  const amounts: Record<string, { value: number | null; locked: boolean }> = {};
  for (const m of members) {
    parts[m.id] = 1;
    amounts[m.id] = { value: null, locked: false };
  }
  for (const share of expense.shares) {
    selected.add(share.memberId);
    if (expense.mode === 'parts') {
      parts[share.memberId] = Math.max(1, Math.round(share.value ?? 1));
    } else if (expense.mode === 'amounts') {
      amounts[share.memberId] = {
        value: share.locked ? share.value : null,
        locked: share.locked,
      };
    }
  }
  return { selected, parts, amounts };
}

function privateSelectionState(
  members: TripMember[],
  privateUserIds: string[],
): SelectionState {
  const privateSet = new Set(privateUserIds);
  const selected = new Set(
    members
      .filter((m) => m.userId && privateSet.has(m.userId))
      .map((m) => m.id),
  );
  const parts: Record<string, number> = {};
  const amounts: Record<string, { value: number | null; locked: boolean }> = {};
  for (const m of members) {
    parts[m.id] = 1;
    amounts[m.id] = { value: null, locked: false };
  }
  return { selected, parts, amounts };
}

interface ExpenseBodyProps {
  trip: Trip;
  expense?: Expense | null;
  onClose: () => void;
  itemId?: string;
  privateToUserIds?: string[];
  defaultCategory?: ExpenseCategory;
  defaultTitle?: string;
  lockTitle?: boolean;
  onAdded?: (expense: Expense) => void;
}

function ExpenseBody({
  trip,
  expense,
  onClose,
  itemId,
  privateToUserIds,
  defaultCategory,
  defaultTitle,
  lockTitle,
  onAdded,
}: ExpenseBodyProps) {
  const { addExpense, updateExpense, removeExpense } = useTrips();
  const isEdit = !!expense;
  const members = trip.members;
  const isPrivate = !!privateToUserIds && privateToUserIds.length > 0;
  // Last-used payer/split are restored only for a plain new expense — edit
  // hydrates from the expense, and the private flow forces its own member set.
  // Read once on mount (the body remounts per open), not on every keystroke.
  const storedDefaults = useMemo(
    () => (!isEdit && !isPrivate ? readExpenseDefaults(trip.id) : null),
    [isEdit, isPrivate, trip.id],
  );
  const memberIds = members.map((m) => m.id);

  const [title, setTitle] = useState<string>(
    expense?.title ?? defaultTitle ?? '',
  );
  const [amountText, setAmountText] = useState<string>(
    expense ? formatAmountInput(expense.amount) : '',
  );
  const [currency, setCurrency] = useState<string>(expense?.currency ?? 'EUR');
  const [payerId, setPayerId] = useState<string>(
    expense?.payerMemberId ??
      resolvePayerDefault({
        stored: storedDefaults,
        memberIds,
        fallback: members[0]?.id ?? '',
      }),
  );
  const [spentOn, setSpentOn] = useState<string>(
    expense?.spentOn ?? todayLocalDate(),
  );
  const [mode, setMode] = useState<ExpenseSplitMode>(
    expense?.mode ?? 'equally',
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? defaultCategory ?? 'other',
  );
  const [resolved, setResolved] = useState<boolean>(expense?.resolved ?? false);
  const [selection, setSelection] = useState<SelectionState>(() => {
    if (expense) return hydrateFromExpense(expense, members);
    if (privateToUserIds && privateToUserIds.length > 0)
      return privateSelectionState(members, privateToUserIds);
    return defaultSelectionState(
      members,
      resolveSelectionDefault({ stored: storedDefaults, memberIds }),
    );
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const parsedAmount = parseAmountInput(amountText);
  const selectedMembers = members.filter((m) => selection.selected.has(m.id));

  const splitPreview = useMemo(() => {
    if (parsedAmount === null || parsedAmount <= 0) return null;
    if (selectedMembers.length === 0) return null;
    if (mode === 'equally') {
      const each = parsedAmount / selectedMembers.length;
      return new Map(selectedMembers.map((m) => [m.id, each]));
    }
    if (mode === 'parts') {
      const totalParts = selectedMembers.reduce(
        (sum, m) => sum + (selection.parts[m.id] ?? 1),
        0,
      );
      if (totalParts <= 0) return null;
      return new Map(
        selectedMembers.map((m) => [
          m.id,
          ((selection.parts[m.id] ?? 1) / totalParts) * parsedAmount,
        ]),
      );
    }
    // mode === 'amounts'
    const pinnedTotal = selectedMembers.reduce(
      (sum, m) =>
        sum +
        (selection.amounts[m.id]?.locked
          ? (selection.amounts[m.id]?.value ?? 0)
          : 0),
      0,
    );
    const unlocked = selectedMembers.filter(
      (m) => !selection.amounts[m.id]?.locked,
    );
    const remainder = parsedAmount - pinnedTotal;
    const perUnlocked = unlocked.length > 0 ? remainder / unlocked.length : 0;
    return new Map(
      selectedMembers.map((m) => {
        const entry = selection.amounts[m.id];
        if (entry?.locked) return [m.id, entry.value ?? 0];
        return [m.id, perUnlocked];
      }),
    );
  }, [parsedAmount, mode, selectedMembers, selection]);

  const amountsLockedTotal = useMemo(() => {
    if (mode !== 'amounts') return 0;
    return selectedMembers.reduce(
      (sum, m) =>
        sum +
        (selection.amounts[m.id]?.locked
          ? (selection.amounts[m.id]?.value ?? 0)
          : 0),
      0,
    );
  }, [mode, selectedMembers, selection]);

  const allPinned =
    mode === 'amounts' &&
    selectedMembers.length > 0 &&
    selectedMembers.every((m) => selection.amounts[m.id]?.locked);

  const handleToggleMember = (memberId: string) => {
    setSelection((prev) => {
      const next = new Set(prev.selected);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return { ...prev, selected: next };
    });
  };

  const handlePartsChange = (memberId: string, value: number) => {
    setSelection((prev) => ({
      ...prev,
      parts: { ...prev.parts, [memberId]: Math.max(1, value) },
    }));
  };

  const handleAmountChange = (memberId: string, value: number | null) => {
    setSelection((prev) => ({
      ...prev,
      amounts: {
        ...prev.amounts,
        [memberId]: { value, locked: prev.amounts[memberId]?.locked ?? false },
      },
    }));
  };

  const handleToggleLock = (memberId: string) => {
    setSelection((prev) => {
      const entry = prev.amounts[memberId] ?? { value: null, locked: false };
      return {
        ...prev,
        amounts: {
          ...prev.amounts,
          [memberId]: { ...entry, locked: !entry.locked },
        },
      };
    });
  };

  const buildShares = (): ExpenseShare[] => {
    if (mode === 'equally') {
      return selectedMembers.map((m) => ({
        memberId: m.id,
        value: null,
        locked: false,
      }));
    }
    if (mode === 'parts') {
      return selectedMembers.map((m) => ({
        memberId: m.id,
        value: Math.max(1, selection.parts[m.id] ?? 1),
        locked: false,
      }));
    }
    return selectedMembers.map((m) => {
      const entry = selection.amounts[m.id] ?? { value: null, locked: false };
      return {
        memberId: m.id,
        value: entry.locked ? (entry.value ?? 0) : null,
        locked: entry.locked,
      };
    });
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Add a title.');
      return;
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    if (!payerId) {
      setError('Pick who paid.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Include at least one person.');
      return;
    }
    if (mode === 'amounts' && allPinned) {
      if (Math.abs(amountsLockedTotal - parsedAmount) > 0.005) {
        setError(
          `Pinned amounts (${amountsLockedTotal.toFixed(
            2,
          )}) must match the total (${parsedAmount.toFixed(2)}).`,
        );
        return;
      }
    }

    const shares = buildShares();
    const roundedAmount = Math.round(parsedAmount * 100) / 100;
    const linkedItemId = expense?.itemId ?? itemId;
    const draft: ExpenseDraft = {
      tripId: trip.id,
      itemId: linkedItemId,
      title: title.trim(),
      amount: roundedAmount,
      currency: currency.toUpperCase(),
      payerMemberId: payerId,
      spentOn,
      mode,
      category,
      resolved,
      shares,
    };

    setSaving(true);
    try {
      if (isEdit && expense) {
        const patch: ExpensePatch = {
          title: draft.title,
          amount: draft.amount,
          currency: draft.currency,
          payerMemberId: draft.payerMemberId,
          spentOn: draft.spentOn,
          mode: draft.mode,
          category: draft.category,
          resolved: draft.resolved,
          shares: draft.shares,
        };
        await updateExpense(trip.id, expense.id, patch);
        toast.success('Expense updated');
      } else {
        const created = await addExpense(draft);
        // Remember who paid and who it was split with for the next new expense.
        // Skip the private flow so it doesn't pollute the general default.
        if (!isPrivate) {
          writeExpenseDefaults(trip.id, {
            payerMemberId: payerId,
            selectedMemberIds: [...selection.selected],
          });
        }
        onAdded?.(created);
        toast.success('Expense added');
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(`Couldn't save expense: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    setSaving(true);
    try {
      await removeExpense(trip.id, expense.id);
      toast.success('Expense deleted');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(`Couldn't delete: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div>
        <SheetTitle>{isEdit ? 'Edit expense' : 'Add expense'}</SheetTitle>
        <SheetDescription>
          Track what got spent and how to split it.
        </SheetDescription>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="expense-title">What</Label>
          <Input
            id="expense-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dinner at Ramiro"
            autoFocus={!lockTitle}
            disabled={lockTitle}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="expense-category">Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ExpenseCategory)}
          >
            <SelectTrigger id="expense-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-[1fr_88px] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              id="expense-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amountText}
              onChange={(e) =>
                setAmountText(e.target.value.replace(/[^\d.,-]/g, ''))
              }
              onBlur={() => {
                const parsed = parseAmountInput(amountText);
                if (parsed !== null) {
                  setAmountText(formatAmountInput(parsed));
                }
              }}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expense-currency">Currency</Label>
            <CurrencyCombobox
              id="expense-currency"
              value={currency}
              onChange={setCurrency}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="expense-payer">Paid by</Label>
            <Select value={payerId} onValueChange={setPayerId}>
              <SelectTrigger id="expense-payer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value || todayLocalDate())}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Split</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['equally', 'parts', 'amounts'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={m === mode}
                className={cn(
                  'rounded-[var(--radius)] border px-2 py-2 text-xs capitalize transition',
                  m === mode
                    ? 'border-foreground/20 bg-secondary'
                    : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="border-border/60 grid gap-1 rounded-[var(--radius)] border p-2">
          {members.map((member) => {
            const isSelected = selection.selected.has(member.id);
            const previewVal = splitPreview?.get(member.id);
            return (
              <MemberRow
                key={member.id}
                member={member}
                isSelected={isSelected}
                onToggle={() => handleToggleMember(member.id)}
                mode={mode}
                parts={selection.parts[member.id] ?? 1}
                onPartsChange={(v) => handlePartsChange(member.id, v)}
                amountEntry={
                  selection.amounts[member.id] ?? { value: null, locked: false }
                }
                onAmountChange={(v) => handleAmountChange(member.id, v)}
                onToggleLock={() => handleToggleLock(member.id)}
                previewAmount={previewVal}
                currency={currency}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setResolved((v) => !v)}
          aria-pressed={resolved}
          className="border-border/60 hover:bg-secondary/40 flex items-start gap-2.5 rounded-[var(--radius)] border p-2.5 text-left transition"
        >
          <span
            className={cn(
              'border-border mt-0.5 grid size-5 shrink-0 place-items-center rounded border',
              resolved
                ? 'bg-primary border-primary text-primary-foreground'
                : '',
            )}
            aria-hidden
          >
            {resolved && (
              <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
                <path d="M6.2 10.6 3.4 7.8l-.9.9 3.7 3.7 8-8-.9-.9z" />
              </svg>
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">Already settled</span>
            <span className="text-muted-foreground block text-xs">
              Each member already paid their share. Keep it in totals, but skip
              it in the balance.
            </span>
          </span>
        </button>

        {mode === 'amounts' && parsedAmount !== null && (
          <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
            <span>
              Pinned total: {amountsLockedTotal.toFixed(2)} /{' '}
              {parsedAmount.toFixed(2)}
            </span>
            <span
              className={
                Math.abs(amountsLockedTotal - parsedAmount) > 0.005 && allPinned
                  ? 'text-destructive'
                  : ''
              }
            >
              {allPinned
                ? Math.abs(amountsLockedTotal - parsedAmount) > 0.005
                  ? 'Off by ' +
                    Math.abs(amountsLockedTotal - parsedAmount).toFixed(2)
                  : 'OK'
                : `${(parsedAmount - amountsLockedTotal).toFixed(2)} to split`}
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>

      <SheetFooter>
        {isEdit && (
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
            disabled={saving}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive mr-auto"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
        <SheetClose asChild>
          <Button variant="ghost">Cancel</Button>
        </SheetClose>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
        </Button>
      </SheetFooter>

      {expense && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete expense"
          description={`"${expense.title}" will be permanently removed.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

interface MemberRowProps {
  member: TripMember;
  isSelected: boolean;
  onToggle: () => void;
  mode: ExpenseSplitMode;
  parts: number;
  onPartsChange: (value: number) => void;
  amountEntry: { value: number | null; locked: boolean };
  onAmountChange: (value: number | null) => void;
  onToggleLock: () => void;
  previewAmount: number | undefined;
  currency: string;
}

function MemberRow({
  member,
  isSelected,
  onToggle,
  mode,
  parts,
  onPartsChange,
  amountEntry,
  onAmountChange,
  onToggleLock,
  previewAmount,
  currency,
}: MemberRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 transition',
        isSelected ? '' : 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'border-border focus-visible:ring-ring/60 grid size-5 shrink-0 place-items-center rounded border outline-none focus-visible:ring-2',
          isSelected ? 'bg-primary border-primary text-primary-foreground' : '',
        )}
        aria-pressed={isSelected}
        aria-label={`Include ${member.displayName}`}
      >
        {isSelected && (
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
            <path d="M6.2 10.6 3.4 7.8l-.9.9 3.7 3.7 8-8-.9-.9z" />
          </svg>
        )}
      </button>
      <span className="min-w-0 flex-1 truncate text-sm">
        {member.displayName}
      </span>
      {isSelected && mode === 'parts' && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPartsChange(parts - 1)}
            className="border-border hover:bg-secondary grid size-6 place-items-center rounded border"
            aria-label="Decrement"
          >
            −
          </button>
          <span className="w-6 text-center text-sm tabular-nums">{parts}</span>
          <button
            type="button"
            onClick={() => onPartsChange(parts + 1)}
            className="border-border hover:bg-secondary grid size-6 place-items-center rounded border"
            aria-label="Increment"
          >
            +
          </button>
        </div>
      )}
      {isSelected && mode === 'amounts' && (
        <>
          <Input
            type="text"
            inputMode="decimal"
            value={
              amountEntry.locked
                ? formatAmountInput(amountEntry.value ?? 0)
                : ''
            }
            onChange={(e) => {
              const parsed = parseAmountInput(e.target.value);
              onAmountChange(parsed);
            }}
            placeholder={
              previewAmount !== undefined ? previewAmount.toFixed(2) : 'auto'
            }
            disabled={!amountEntry.locked}
            className="h-7 w-20 px-2 text-right text-xs tabular-nums"
          />
          <button
            type="button"
            onClick={onToggleLock}
            className={cn(
              'hover:bg-secondary grid size-6 place-items-center rounded',
              amountEntry.locked ? 'text-foreground' : 'text-muted-foreground',
            )}
            aria-label={amountEntry.locked ? 'Unlock' : 'Lock'}
            aria-pressed={amountEntry.locked}
          >
            {amountEntry.locked ? (
              <Lock className="size-3.5" />
            ) : (
              <LockOpen className="size-3.5" />
            )}
          </button>
        </>
      )}
      {isSelected && previewAmount !== undefined && (
        <span className="text-muted-foreground w-20 text-right text-xs tabular-nums">
          {previewAmount.toFixed(2)} {currency.toUpperCase()}
        </span>
      )}
    </div>
  );
}
