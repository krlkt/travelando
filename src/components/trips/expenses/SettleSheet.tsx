'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
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
import { useTrips } from '@/lib/trips/context';
import { parseAmountInput } from '@/lib/trips/grouping';
import type { Trip, TripMember } from '@/lib/trips/types';

const FALLBACK_CURRENCY = 'EUR';

interface SettleSheetProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TripMember[];
  /** Distinct currencies used in the trip; first is the default. */
  currencies: string[];
  /** Defaults the "from" side to the current user when they have a member row. */
  currentMemberId: string | null;
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function SettleSheet({
  trip,
  open,
  onOpenChange,
  members,
  currencies,
  currentMemberId,
}: SettleSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:w-[420px]">
        {open && (
          <SettleBody
            trip={trip}
            onClose={() => onOpenChange(false)}
            members={members}
            currencies={currencies}
            currentMemberId={currentMemberId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SettleBodyProps {
  trip: Trip;
  onClose: () => void;
  members: TripMember[];
  currencies: string[];
  currentMemberId: string | null;
}

function SettleBody({
  trip,
  onClose,
  members,
  currencies,
  currentMemberId,
}: SettleBodyProps) {
  const { addSettlement } = useTrips();

  // Default: from = me (if I have a member row), else the first member.
  const defaultFromId = useMemo(() => {
    if (currentMemberId && members.some((m) => m.id === currentMemberId)) {
      return currentMemberId;
    }
    return members[0]?.id ?? '';
  }, [currentMemberId, members]);

  const [fromId, setFromId] = useState(defaultFromId);
  const [toId, setToId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [currency, setCurrency] = useState(currencies[0] ?? FALLBACK_CURRENCY);
  const [settledOn, setSettledOn] = useState(todayLocalDate());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fromMember = members.find((m) => m.id === fromId) ?? null;
  const toMember = members.find((m) => m.id === toId) ?? null;

  const amount = parseAmountInput(amountInput);
  const sameParty = fromId !== '' && fromId === toId;
  const canSubmit =
    !!fromMember &&
    !!toMember &&
    !sameParty &&
    amount !== null &&
    amount > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !fromMember || !toMember || amount === null) return;
    setSubmitting(true);
    try {
      await addSettlement({
        tripId: trip.id,
        fromMemberId: fromMember.id,
        toMemberId: toMember.id,
        amount,
        currency,
        settledOn,
        note: note.trim() || undefined,
      });
      toast.success('Settlement recorded');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to settle');
    } finally {
      setSubmitting(false);
    }
  }

  if (members.length < 2) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-muted-foreground text-sm">
          Add at least two trip members to record a settlement.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/60 border-b px-6 py-5">
        <SheetTitle className="text-lg">Settle up</SheetTitle>
        <SheetDescription className="text-muted-foreground mt-1 text-xs">
          Record a real-world money transfer between any two members.
        </SheetDescription>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5">
          <section className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settle-from">From</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger id="settle-from">
                  <SelectValue placeholder="Who paid" />
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
            <ArrowRight className="text-muted-foreground mb-2.5 size-4 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settle-to">To</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger id="settle-to">
                  <SelectValue placeholder="Who received" />
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
          </section>

          {sameParty && (
            <p className="text-destructive text-xs">
              Pick two different members.
            </p>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settle-amount">Amount</Label>
              <Input
                id="settle-amount"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settle-currency">Currency</Label>
              {currencies.length > 1 ? (
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="settle-currency" className="min-w-[88px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border-input bg-card flex h-9 items-center rounded-md border px-3 text-sm font-medium tabular-nums">
                  {currency}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settle-date">Date</Label>
            <Input
              id="settle-date"
              type="date"
              value={settledOn}
              onChange={(e) => setSettledOn(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settle-note">Note (optional)</Label>
            <Input
              id="settle-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. cash, bank transfer"
              maxLength={280}
            />
          </div>
        </div>
      </div>

      <SheetFooter className="border-border/60 border-t px-6 py-4">
        <SheetClose asChild>
          <Button variant="ghost" type="button">
            Cancel
          </Button>
        </SheetClose>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving…' : 'Record settlement'}
        </Button>
      </SheetFooter>
    </div>
  );
}
