'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useTrips } from '@/lib/trips/context';
import { itemKinds, transportModes, kindMeta } from '@/lib/trips/kindMeta';
import type {
  ItemDraft,
  ItemKind,
  TransportMode,
  TripItem,
} from '@/lib/trips/types';

interface ItemEditorSheetProps {
  tripId: string;
  item?: TripItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function ItemEditorSheet({
  tripId,
  item,
  open,
  onOpenChange,
}: ItemEditorSheetProps) {
  const { addItem, updateItem } = useTrips();
  const isEdit = !!item;

  const [kind, setKind] = useState<ItemKind>('activity');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [fromLabel, setFromLabel] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('flight');
  const [notes, setNotes] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState('EUR');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind(item?.kind ?? 'activity');
    setTitle(item?.title ?? '');
    setStartsAt(toLocalInput(item?.startsAt));
    setEndsAt(toLocalInput(item?.endsAt));
    setFromLabel(item?.from?.label ?? '');
    setToLabel(item?.to?.label ?? '');
    setTransportMode((item?.transportMode as TransportMode) ?? 'flight');
    setNotes(item?.notes ?? '');
    setExpenseAmount(item?.expense ? String(item.expense.amount) : '');
    setExpenseCurrency(item?.expense?.currency ?? 'EUR');
    setError(null);
  }, [open, item]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('Add a title.');
      return;
    }
    if (!startsAt) {
      setError('Pick a start time.');
      return;
    }
    if (endsAt && new Date(endsAt) < new Date(startsAt)) {
      setError("End time can't be before the start.");
      return;
    }

    const draft: ItemDraft = {
      kind,
      title: title.trim(),
      startsAt: fromLocalInput(startsAt),
      endsAt: endsAt ? fromLocalInput(endsAt) : undefined,
      from: fromLabel.trim() ? { label: fromLabel.trim() } : undefined,
      to: toLabel.trim() ? { label: toLabel.trim() } : undefined,
      transportMode: kind === 'transport' ? transportMode : undefined,
      notes: notes.trim() || undefined,
      expense:
        expenseAmount && !Number.isNaN(Number(expenseAmount))
          ? {
              amount: Number(expenseAmount),
              currency: expenseCurrency.toUpperCase(),
            }
          : undefined,
    };

    if (isEdit && item) {
      updateItem(tripId, item.id, draft);
      toast.success('Item updated');
    } else {
      addItem(tripId, draft);
      toast.success('Item added');
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[480px]">
        <div>
          <SheetTitle>{isEdit ? 'Edit item' : 'Add to trip'}</SheetTitle>
          <SheetDescription>
            Pick a type, drop in what you know. Everything else can wait.
          </SheetDescription>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {itemKinds.map((k) => {
                const meta = kindMeta[k];
                const Icon = meta.icon;
                const active = k === kind;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setKind(k)}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 rounded-[var(--radius)] border px-2 py-2.5 text-[11px] transition ${
                      active
                        ? 'border-foreground/20 bg-secondary'
                        : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                    }`}
                  >
                    <span
                      className="text-background grid size-7 place-items-center rounded-full"
                      style={{ background: meta.accent }}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dinner at Cervejaria Ramiro"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-start">Starts</Label>
              <Input
                id="item-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-end">Ends</Label>
              <Input
                id="item-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={startsAt}
              />
            </div>
          </div>

          {kind === 'transport' && (
            <div className="grid gap-1.5">
              <Label>Mode</Label>
              <Select
                value={transportMode}
                onValueChange={(v) => setTransportMode(v as TransportMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transportModes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m[0].toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-from">From</Label>
              <Input
                id="item-from"
                value={fromLabel}
                onChange={(e) => setFromLabel(e.target.value)}
                placeholder={
                  kind === 'transport' ? 'AMS Schiphol' : '(optional)'
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-to">
                {kind === 'transport' ? 'To' : 'Place'}
              </Label>
              <Input
                id="item-to"
                value={toLabel}
                onChange={(e) => setToLabel(e.target.value)}
                placeholder={
                  kind === 'transport' ? 'LIS Lisbon' : 'Cervejaria Ramiro'
                }
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="item-notes">Notes</Label>
            <Textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Flight KL 1693 · Seat 14A · Gate D4"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-[1fr_88px] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="item-amount">Expense</Label>
              <Input
                id="item-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-currency">Currency</Label>
              <Input
                id="item-currency"
                value={expenseCurrency}
                onChange={(e) =>
                  setExpenseCurrency(e.target.value.toUpperCase().slice(0, 3))
                }
                placeholder="EUR"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave}>
            {isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
